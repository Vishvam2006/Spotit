import { GOOGLE_MAPS_API_KEY } from '../config/map';
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
