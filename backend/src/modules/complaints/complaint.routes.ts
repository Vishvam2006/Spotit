import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createComplaint,
  getMyComplaints,
  getMyComplaintById,
} from './complaint.controller';

const router = Router();

router.use(authenticate);

router.post('/', createComplaint);
router.get('/', getMyComplaints);
router.get('/:id', getMyComplaintById);

export default router;