import { MapPin, Navigation } from 'lucide-react';
import type { ParkingLot } from '../../types/parking';
import { formatDistanceKm } from '../../utils/distance';
import { getMarkerAvailability } from '../../utils/markerAvailability';

interface ParkingCardProps {
  parking: ParkingLot;
  selected: boolean;
  onSelect: (parking: ParkingLot) => void;
  onViewDetails?: (parking: ParkingLot) => void;
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
  onViewDetails,
}: ParkingCardProps) {
  const { color, label } = getMarkerAvailability(parking);
  const imageUrl = parking.photos?.[0] ?? parking.imageUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(parking)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(parking);
        }
      }}
      className={`w-full cursor-pointer rounded-xl border p-4 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        selected
          ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500'
          : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {imageUrl && (
        <div className="-mx-4 -mt-4 mb-4 aspect-video overflow-hidden rounded-t-xl bg-slate-100">
          <img src={imageUrl} alt={parking.name} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-950">
            {parking.name}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {parking.address}, {parking.city}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badgeStyles[color]}`}
        >
          {label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <div>
          <dt className="text-slate-400">Price</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-950">₹{parking.pricePerHour}/hr</dd>
        </div>
        <div>
          <dt className="text-slate-400">Slots</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-950">
            {parking.availableSpaces}/{parking.totalSpaces}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Distance</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-950">
            {parking.distanceKm === undefined ? 'Nearby' : formatDistanceKm(parking.distanceKm)}
          </dd>
        </div>
      </dl>

      {onViewDetails && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails(parking);
          }}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Reserve spot
          <Navigation className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
