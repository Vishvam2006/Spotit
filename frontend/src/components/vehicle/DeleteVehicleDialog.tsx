import ConfirmDialog from '../ui/ConfirmDialog';
import type { Vehicle } from '../../types/vehicle';
import { vehicleTypeLabel } from '../../utils/vehicle';

interface DeleteVehicleDialogProps {
  vehicle: Vehicle;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteVehicleDialog({
  vehicle,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteVehicleDialogProps) {
  return (
    <ConfirmDialog
      title="Delete this vehicle?"
      message={`${vehicle.registration} (${vehicleTypeLabel(vehicle.type)}) will be removed from your garage. Bookings you already made are unaffected.`}
      confirmLabel="Delete vehicle"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
