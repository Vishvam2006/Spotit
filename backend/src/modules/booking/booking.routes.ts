import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { bookingRateLimiter } from '../../middleware/rateLimit';
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

export default router;
