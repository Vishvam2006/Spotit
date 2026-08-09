const env = process.env;

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}

export const geofenceConfig = {
  geofenceEnabled: parseBoolean(env.GEOFENCE_ENABLED, true),
  demoMode: parseBoolean(env.DEMO_MODE, false),
  checkinRadiusMeters: parseNumber(env.CHECKIN_RADIUS_METERS, 120),
  checkoutRadiusMeters: parseNumber(env.CHECKOUT_RADIUS_METERS, 200),
  maxAccuracyMeters: parseNumber(env.MAX_ACCURACY_METERS, 50),
  locationMaxAgeSeconds: parseNumber(env.LOCATION_MAX_AGE_SECONDS, 60),
  minCheckinReadings: parseNumber(env.MIN_CHECKIN_READINGS, 2),
  minDwellSeconds: parseNumber(env.MIN_DWELL_SECONDS, 30),
  requiredOutsideReadings: parseNumber(env.REQUIRED_OUTSIDE_READINGS, 3),
  checkoutGraceSeconds: parseNumber(env.CHECKOUT_GRACE_SECONDS, 180),
  maxSpeedMps: parseNumber(env.MAX_SPEED_MPS, 30),
  heartbeatIntervalSeconds: parseNumber(env.HEARTBEAT_INTERVAL_SECONDS, 30),
  sessionStaleSeconds: parseNumber(env.SESSION_STALE_SECONDS, 120),
  rateLimitWindowMs: parseNumber(env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parseNumber(env.RATE_LIMIT_MAX, 20),
};
