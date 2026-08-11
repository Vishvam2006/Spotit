import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getVehicleUploadSignature } from './uploads.controller';

const router = Router();

router.post('/vehicle-image-signature', authenticate, getVehicleUploadSignature);

export default router;
