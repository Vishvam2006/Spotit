import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getEvidenceUploadSignature,
  getParkingUploadSignature,
  getVehicleUploadSignature,
  getProfileUploadSignature,
} from './uploads.controller';

const router = Router();

router.post('/parking-photo-signature', authenticate, getParkingUploadSignature);
router.post('/vehicle-image-signature', authenticate, getVehicleUploadSignature);
router.post('/profile-image-signature', authenticate, getProfileUploadSignature);
router.post('/evidence-signature', authenticate, getEvidenceUploadSignature);

export default router;
