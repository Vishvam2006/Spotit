import { GOOGLE_MAPS_API_KEY } from '../config/map';
import type { LatLng } from './geolocation';

const DEMO_LOCATIONS: Record<string, LatLng> = {
  'delhi gate': { lat: 28.6427, lng: 77.241 },
  'mg road': { lat: 12.9756, lng: 77.6068 },
  whitefield: { lat: 12.9698, lng: 77.7499 },
  koramangala: { lat: 12.9352, lng: 77.6245 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
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

  if (!GOOGLE_MAPS_API_KEY) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', trimmed);
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return demo;

    const data = (await response.json()) as {
      status: string;
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };

    if (data.status === 'OK' && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch {
    return demo;
  }

  return demo;
}
