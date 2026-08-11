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
        <span className="block text-sm font-medium text-slate-700">Vehicle</span>
        <div className="mt-1.5 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Add a vehicle with a photo before booking a spot.
          </p>
          <button
            type="button"
            onClick={onManage}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <span className="block text-sm font-medium text-slate-700">Vehicle</span>
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
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
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                selected
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {vehicle.imageUrl ? (
                  <img
                    src={vehicle.imageUrl}
                    alt={vehicle.registration}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {vehicle.registration}
                </p>
                <p className="truncate text-xs text-slate-500">
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
