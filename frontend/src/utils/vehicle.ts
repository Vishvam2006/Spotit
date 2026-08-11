import type { VehicleType } from '../types/vehicle';

export function vehicleTypeLabel(type: VehicleType): string {
  return type === 'TWO_WHEELER' ? 'Two wheeler' : 'Four wheeler';
}
