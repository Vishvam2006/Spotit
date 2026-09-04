import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { bookingRateLimiter } from '../../middleware/rateLimit';
import { getPendingReassignment, declineReassignment } from './reassignment.controller';

const router = Router();

router.use(authenticate);
router.use(bookingRateLimiter);

router.get('/pending', getPendingReassignment);
router.post('/:id/decline', declineReassignment);

export default router;
