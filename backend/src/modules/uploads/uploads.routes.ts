import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getParkingUploadSignature,
  getVehicleUploadSignature,
} from './uploads.controller';

const router = Router();

router.post('/parking-photo-signature', authenticate, getParkingUploadSignature);
router.post('/vehicle-image-signature', authenticate, getVehicleUploadSignature);

export default router;
