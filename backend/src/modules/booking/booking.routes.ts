import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
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

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/:id/check-in', checkInBooking);
router.post('/:id/check-out', checkOutBooking);
router.post('/:id/heartbeat', heartbeatBooking);
router.post('/:id/cancel', cancelBooking);

export default router;
