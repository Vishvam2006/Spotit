import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getEvidenceUploadSignature,
  getParkingUploadSignature,
  getVehicleUploadSignature,
} from './uploads.controller';

const router = Router();

router.post('/parking-photo-signature', authenticate, getParkingUploadSignature);
router.post('/vehicle-image-signature', authenticate, getVehicleUploadSignature);
router.post('/evidence-signature', authenticate, getEvidenceUploadSignature);

export default router;
