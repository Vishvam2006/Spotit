import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/requireOwner';
import {
  getAnalytics,
  getDashboard,
  getOwnerBookings,
  getOwnerParkings,
  getParkingStatus,
  getRevenue,
} from './owner.controller';

const router = Router();

router.use(authenticate);
router.use(requireOwner);

router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenue);
router.get('/parkings', getOwnerParkings);
router.get('/parkings/:id/status', getParkingStatus);
router.get('/bookings', getOwnerBookings);
router.get('/analytics', getAnalytics);

export default router;