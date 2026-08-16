import rateLimit from 'express-rate-limit';
import { geofenceConfig } from '../config/geofence';

export const bookingRateLimiter = rateLimit({
  windowMs: geofenceConfig.rateLimitWindowMs,
  limit: geofenceConfig.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ success: false, message: 'Too many requests. Please try again later.' });
  },
});

/**
 * Strict limiter for credential-based endpoints (register/login) to slow
 * brute-force and credential-stuffing attacks. Limit is configurable so
 * environments can tune it (tests raise it to avoid throttling).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ success: false, message: 'Too many attempts. Please try again later.' });
  },
});