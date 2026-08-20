import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwner } from '../../middleware/requireOwner';
import { reportRateLimiter } from '../../middleware/rateLimit';
import {
  getLotReliabilityHandler,
  getOwnerReports,
  resolveReport,
  reportLotIssue,
} from './continuity.controller';

/**
 * Owner- and admin-facing half of the Continuity Engine. The user-facing half
 * (report an issue, booking timeline) hangs off /api/bookings, next to the
 * booking those endpoints act on.
 */
const router = Router();

router.use(authenticate);

router.get('/owner/reports', requireOwner, getOwnerReports);
router.patch('/reports/:id', requireOwner, resolveReport);
router.get('/lots/:id/reliability', requireOwner, getLotReliabilityHandler);

router.post('/lots/:id/report', reportRateLimiter, reportLotIssue);

export default router;
