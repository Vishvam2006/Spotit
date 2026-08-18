import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { bookingRateLimiter } from '../../middleware/rateLimit';
import {
  reportBookingIssue,
  getBookingTimelineHandler,
} from '../continuity/continuity.controller';
import {
  createBooking,
  getBookings,
  getBookingById,
  checkInBooking,
  checkOutBooking,
  heartbeatBooking,
  cancelBooking,
} from './booking.controller';

const router = Router();

router.use(authenticate);
router.use(bookingRateLimiter);

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/:id/check-in', checkInBooking);
router.post('/:id/check-out', checkOutBooking);
router.post('/:id/heartbeat', heartbeatBooking);
router.post('/:id/cancel', cancelBooking);

// Continuity Engine: the failure path lives beside the booking it protects.
router.post('/:id/report-issue', reportBookingIssue);
router.get('/:id/timeline', getBookingTimelineHandler);

export default router;
