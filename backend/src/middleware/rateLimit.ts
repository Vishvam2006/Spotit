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
