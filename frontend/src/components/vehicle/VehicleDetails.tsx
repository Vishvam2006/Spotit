import { Car, Info } from 'lucide-react';
import type { BookingVehicle } from '../../types/booking';
import { vehicleTypeLabel } from '../../utils/vehicle';

interface VehicleDetailsProps {
  vehicle: BookingVehicle;
}

/**
 * Renders the vehicle attached to a booking. Historical bookings (created
 * before the vehicle library) have an empty image URL, so a placeholder is
 * shown in that legacy state.
 */
export default function VehicleDetails({ vehicle }: VehicleDetailsProps) {
  const hasImage = vehicle.imageUrl !== '';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
          hasImage ? '' : 'bg-[var(--pm-color-surface-raised)]'
        }`}
      >
        {hasImage ? (
          <img
            src={vehicle.imageUrl}
            alt={vehicle.registration}
            className="h-full w-full object-cover"
          />
        ) : (
          <Car className="h-6 w-6 text-[var(--pm-color-muted)]" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--pm-color-text)]">
          {vehicle.registration}
        </p>
        <p className="truncate text-sm text-[var(--pm-color-muted)]">
          {vehicleTypeLabel(vehicle.type)}
          {vehicle.make ? ` · ${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ''}` : ''}
        </p>
        {!hasImage && (
          <p className="flex items-center gap-1 text-xs text-[var(--pm-color-muted)]">
            <Info className="h-3 w-3" />
            Added before photo capture
          </p>
        )}
      </div>
    </div>
  );
}
