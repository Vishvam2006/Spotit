import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createOrder,
  verifyPayment,
  createReassignmentOrder,
  verifyReassignmentPayment,
} from './payment.controller';

const router = Router();

router.use(authenticate);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/reassignment/:id/create-order', createReassignmentOrder);
router.post('/reassignment/:id/verify', verifyReassignmentPayment);

export default router;
