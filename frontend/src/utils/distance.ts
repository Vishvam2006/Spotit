const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function haversineDistanceMeters(
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

  return EARTH_RADIUS_METERS * c;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineDistanceMeters(lat1, lng1, lat2, lng2) / 1000;
}

export function isWithinRadiusKm(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number,
): boolean {
  if (radiusKm <= 0) return false;
  return haversineDistanceKm(centerLat, centerLng, pointLat, pointLng) <= radiusKm;
}

export function formatDistanceKm(radiusKm: number): string {
  if (radiusKm < 1) {
    return `${Math.round(radiusKm * 1000)} m`;
  }
  return `${radiusKm % 1 === 0 ? radiusKm : radiusKm.toFixed(1)} km`;
}

export function formatDistanceMeters(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}
