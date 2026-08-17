import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/requireAdmin';
import {
  getBookings,
  getBookingById,
  getComplaints,
  getComplaintById,
  getDashboard,
  updateComplaintStatus,
} from './admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/complaints', getComplaints);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingById);

export default router;