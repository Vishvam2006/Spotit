import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createVehicle,
  deleteVehicle,
  getVehicles,
  setDefaultVehicle,
  updateVehicle,
} from './vehicle.controller';

const router = Router();

router.use(authenticate);

router.get('/', getVehicles);
router.post('/', createVehicle);
router.patch('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);
router.post('/:id/default', setDefaultVehicle);

export default router;
