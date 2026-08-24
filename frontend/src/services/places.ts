import type { LatLng } from '../utils/geolocation';
import type { ParkingLot } from '../types/parking';
import { haversineDistanceKm } from '../utils/distance';

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  location: LatLng;
  type: 'parking' | 'landmark' | 'locality' | 'street' | 'address';
  distanceKm?: number;
  parkingLot?: ParkingLot;
}

interface PhotonFeature {
  properties: {
    osm_id?: number | string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    type?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Searches places & parking spots for live autocomplete suggestions.
 * Prioritizes local parking spots, then fetches from Photon (OpenStreetMap),
 * with fallback to Nominatim & demo dataset.
 */
export async function searchPlaceSuggestions(
  query: string,
  userLocation?: LatLng | null,
  parkingLots: ParkingLot[] = [],
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lowerQuery = trimmed.toLowerCase();
  const results: PlaceSuggestion[] = [];
  const seenKeys = new Set<string>();

  // 1. Check local parking lots for instant matches
  for (const lot of parkingLots) {
    const matchName = lot.name.toLowerCase().includes(lowerQuery);
    const matchAddress = lot.address.toLowerCase().includes(lowerQuery);
    const matchCity = lot.city.toLowerCase().includes(lowerQuery);

    if (matchName || matchAddress || matchCity) {
      const key = `${lot.latitude.toFixed(4)},${lot.longitude.toFixed(4)}`;
      seenKeys.add(key);

      const distance = userLocation
        ? haversineDistanceKm(userLocation.lat, userLocation.lng, lot.latitude, lot.longitude)
        : undefined;

      results.push({
        id: `parking-${lot.id}`,
        title: lot.name,
        subtitle: `${lot.address}, ${lot.city} • ₹${lot.pricePerHour}/hr • ${lot.availableSpaces} spots available`,
        location: { lat: lot.latitude, lng: lot.longitude },
        type: 'parking',
        distanceKm: distance,
        parkingLot: lot,
      });
    }

    if (results.length >= 3) break;
  }

  // 2. Fetch live suggestions from Photon (Free OpenStreetMap-powered autocomplete)
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.set('q', trimmed);
    photonUrl.searchParams.set('limit', '8');

    // Proximity bias: if user has a location or default Ahmedabad center
    const biasLat = userLocation?.lat ?? 23.0225;
    const biasLng = userLocation?.lng ?? 72.5714;
    photonUrl.searchParams.set('lat', biasLat.toString());
    photonUrl.searchParams.set('lon', biasLng.toString());

    const response = await fetch(photonUrl.toString(), {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = (await response.json()) as PhotonResponse;
      if (data.features && Array.isArray(data.features)) {
        for (const feature of data.features) {
          const [lon, lat] = feature.geometry.coordinates;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

          const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          const props = feature.properties || {};
          const title = props.name || props.street || props.district || props.city || trimmed;

          // Build clean structured subtitle
          const addressParts = [
            props.street,
            props.district,
            props.city,
            props.state,
            props.country,
          ].filter((part): part is string => Boolean(part && part !== title));

          // Remove consecutive duplicates in address parts
          const uniqueParts = addressParts.filter((item, idx, arr) => arr.indexOf(item) === idx);
          const subtitle = uniqueParts.length > 0 ? uniqueParts.join(', ') : 'Location';

          const distance = userLocation
            ? haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lon)
            : undefined;

          // Infer suggestion type
          let type: PlaceSuggestion['type'] = 'locality';
          if (props.osm_key === 'amenity' || props.osm_key === 'shop' || props.osm_key === 'tourism' || props.osm_key === 'leisure') {
            type = 'landmark';
          } else if (props.osm_key === 'highway' || props.street) {
            type = 'street';
          } else if (props.housenumber || props.postcode) {
            type = 'address';
          }

          results.push({
            id: `photon-${props.osm_id || Math.random()}-${lat}-${lon}`,
            title,
            subtitle,
            location: { lat, lng: lon },
            type,
            distanceKm: distance,
          });

          if (results.length >= 8) break;
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) return results;
    // Photon might be down or blocked, attempt fallback
  }

  // 3. Fallback to OpenStreetMap Nominatim if results are still sparse (< 2)
  if (results.length < 2 && !signal?.aborted) {
    try {
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
      nominatimUrl.searchParams.set('format', 'json');
      nominatimUrl.searchParams.set('q', trimmed);
      nominatimUrl.searchParams.set('limit', '5');
      nominatimUrl.searchParams.set('addressdetails', '1');

      const nomResponse = await fetch(nominatimUrl.toString(), {
        signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ParkMitra-Search/1.0',
        },
      });

      if (nomResponse.ok) {
        const nomData = (await nomResponse.json()) as NominatimResult[];
        for (const item of nomData) {
          const lat = Number.parseFloat(item.lat);
          const lon = Number.parseFloat(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

          const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          const parts = item.display_name.split(',').map((p) => p.trim());
          const title = parts[0] || trimmed;
          const subtitle = parts.slice(1, 4).join(', ');

          const distance = userLocation
            ? haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lon)
            : undefined;

          results.push({
            id: `nom-${item.place_id}`,
            title,
            subtitle: subtitle || item.display_name,
            location: { lat, lng: lon },
            type: 'locality',
            distanceKm: distance,
          });
        }
      }
    } catch {
      // Ignore fallback errors
    }
  }

  return results;
}
