const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Sorts anything with lat/lng nearest-first, tagging each item with its
 * distance from the reference point. Shared by parking search (`sort=nearest`)
 * and the reassignment engine's nearest-candidate lookup so both use the same
 * definition of "nearest".
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  lat: number,
  lng: number,
): (T & { distanceKm: number })[] {
  return items
    .map((item) => ({
      ...item,
      distanceKm: haversineDistanceKm(lat, lng, item.latitude, item.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}