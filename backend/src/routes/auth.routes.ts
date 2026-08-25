import { Router } from 'express';
import { login, me, register, forgotPassword, verifyOtp, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/verify-otp', authRateLimiter, verifyOtp);
router.post('/reset-password', authRateLimiter, resetPassword);
router.get('/me', authenticate, me);

export default router;