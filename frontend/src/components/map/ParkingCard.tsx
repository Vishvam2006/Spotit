import type { ParkingLot } from '../../types/parking';
import { getMarkerAvailability } from '../../utils/markerAvailability';

interface ParkingCardProps {
  parking: ParkingLot;
  selected: boolean;
  onSelect: (parking: ParkingLot) => void;
}

const badgeStyles: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-slate-100 text-slate-600',
};

export default function ParkingCard({
  parking,
  selected,
  onSelect,
}: ParkingCardProps) {
  const { color, label } = getMarkerAvailability(parking);

  return (
    <button
      type="button"
      onClick={() => onSelect(parking)}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {parking.name}
          </h3>
          <p className="truncate text-xs text-slate-500">{parking.address}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStyles[color]}`}
        >
          {label}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <div>
          <dt className="text-slate-400">Price</dt>
          <dd className="font-semibold text-slate-900">₹{parking.pricePerHour}/hr</dd>
        </div>
        <div>
          <dt className="text-slate-400">Available</dt>
          <dd className="font-semibold text-slate-900">{parking.availableSpaces}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Total</dt>
          <dd className="font-semibold text-slate-900">{parking.totalSpaces}</dd>
        </div>
      </dl>
    </button>
  );
}