import type { LatLng } from './geolocation';

const DEMO_LOCATIONS: Record<string, LatLng> = {
  // Ahmedabad localities — these match the seeded parking lots.
  'cg road': { lat: 23.0302, lng: 72.5604 },
  'law garden': { lat: 23.0232, lng: 72.5621 },
  'sg highway': { lat: 23.0272, lng: 72.5073 },
  'sindhu bhavan': { lat: 23.0452, lng: 72.5032 },
  'sabarmati riverfront': { lat: 23.0225, lng: 72.5766 },
  kalupur: { lat: 23.0272, lng: 72.6008 },
  vastrapur: { lat: 23.0387, lng: 72.5305 },
  bodakdev: { lat: 23.0345, lng: 72.5108 },
  satellite: { lat: 23.0296, lng: 72.5288 },
  maninagar: { lat: 22.9964, lng: 72.6023 },
  kankaria: { lat: 22.9951, lng: 72.6004 },
  navrangpura: { lat: 23.0361, lng: 72.5701 },
  paldi: { lat: 23.0104, lng: 72.5672 },
  thaltej: { lat: 23.0464, lng: 72.5329 },
  bopal: { lat: 23.0331, lng: 72.4702 },
  motera: { lat: 23.0919, lng: 72.5975 },
  shahibaug: { lat: 23.0573, lng: 72.5941 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  // Other metros, for search demos.
  'delhi gate': { lat: 28.6427, lng: 77.241 },
  'mg road': { lat: 12.9756, lng: 77.6068 },
  whitefield: { lat: 12.9698, lng: 77.7499 },
  koramangala: { lat: 12.9352, lng: 77.6245 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function getDemoLocation(query: string): LatLng | null {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  if (DEMO_LOCATIONS[normalized]) {
    return DEMO_LOCATIONS[normalized];
  }

  const match = Object.entries(DEMO_LOCATIONS).find(([name]) =>
    normalized.includes(name),
  );
  return match ? match[1] : null;
}

export async function geocodePlaceQuery(query: string): Promise<LatLng | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const demo = getDemoLocation(trimmed);
  if (demo) return demo;

  // 1. Try Photon (Free OpenStreetMap-powered geocoder, CORS friendly)
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.set('q', trimmed);
    photonUrl.searchParams.set('limit', '1');
    photonUrl.searchParams.set('lat', '23.0225');
    photonUrl.searchParams.set('lon', '72.5714');

    const response = await fetch(photonUrl.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        features?: Array<{ geometry: { coordinates: [number, number] } }>;
      };
      if (data.features?.[0]?.geometry?.coordinates) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Try Nominatim (OpenStreetMap Search)
  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('q', trimmed);
    nominatimUrl.searchParams.set('limit', '1');

    const nomRes = await fetch(nominatimUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ParkMitra-Search/1.0',
      },
    });

    if (nomRes.ok) {
      const nomData = (await nomRes.json()) as Array<{ lat: string; lon: string }>;
      if (nomData[0]) {
        const lat = Number.parseFloat(nomData[0].lat);
        const lng = Number.parseFloat(nomData[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch {
    // Return null or demo
  }

  return demo ?? null;
}
