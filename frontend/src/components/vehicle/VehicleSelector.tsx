import { Car, Plus } from 'lucide-react';
import type { Vehicle } from '../../types/vehicle';
import { vehicleTypeLabel } from '../../utils/vehicle';

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedId: string | null;
  onChange: (id: string) => void;
  onManage: () => void;
  disabled?: boolean;
}

export default function VehicleSelector({
  vehicles,
  selectedId,
  onChange,
  onManage,
  disabled = false,
}: VehicleSelectorProps) {
  if (vehicles.length === 0) {
    return (
      <div>
        <span className="block text-sm font-medium text-[var(--pm-color-text)]">Vehicle</span>
        <div className="mt-1.5 flex flex-col gap-3 rounded-xl border border-dashed border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--pm-color-text)]">
            Add a vehicle with a photo before booking a spot.
          </p>
          <button
            type="button"
            onClick={onManage}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add vehicle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="block text-sm font-medium text-[var(--pm-color-text)]">Vehicle</span>
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Manage vehicles
        </button>
      </div>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        {vehicles.map((vehicle) => {
          const selected = vehicle.id === selectedId;
          return (
            <button
              key={vehicle.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(vehicle.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 ${
                selected
                  ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                  : 'border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] hover:bg-[var(--pm-color-surface-raised)]'
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--pm-color-surface-raised)]">
                {vehicle.imageUrl ? (
                  <img
                    src={vehicle.imageUrl}
                    alt={vehicle.registration}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-5 w-5 text-[var(--pm-color-muted)]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--pm-color-text)]">
                  {vehicle.registration}
                </p>
                <p className="truncate text-xs text-[var(--pm-color-muted)]">
                  {vehicleTypeLabel(vehicle.type)}
                  {vehicle.make
                    ? ` · ${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ''}`
                    : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
