import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getProfile, updateProfile } from './user.controller';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);

export default router;
