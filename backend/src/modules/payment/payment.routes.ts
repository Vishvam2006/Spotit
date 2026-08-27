import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { createOrder, verifyPayment } from './payment.controller';

const router = Router();

router.use(authenticate);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

export default router;
