import { Car, Pencil, Star, Trash2 } from 'lucide-react';
import type { Vehicle } from '../../types/vehicle';
import { vehicleTypeLabel } from '../../utils/vehicle';

interface VehicleCardProps {
  vehicle: Vehicle;
  busy?: boolean;
  onSetDefault: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

export default function VehicleCard({
  vehicle,
  busy = false,
  onSetDefault,
  onEdit,
  onDelete,
}: VehicleCardProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center ${
        vehicle.isDefault ? 'ring-blue-300' : ''
      }`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {vehicle.imageUrl ? (
          <img
            src={vehicle.imageUrl}
            alt={vehicle.registration}
            className="h-full w-full object-cover"
          />
        ) : (
          <Car className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-900">{vehicle.registration}</p>
          {vehicle.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              <Star className="h-3 w-3" />
              Default
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {vehicleTypeLabel(vehicle.type)}
          {vehicle.make
            ? ` · ${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ''}`
            : ''}
          {vehicle.color ? ` · ${vehicle.color}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {!vehicle.isDefault && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSetDefault(vehicle)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <Star className="h-3.5 w-3.5" />
            Set default
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(vehicle)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(vehicle)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
