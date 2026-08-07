import { useEffect, useRef } from 'react';
import type { ParkingLot, ParkingLotStatus } from '../../types';

interface ParkingCardProps {
  lot: ParkingLot;
  selected: boolean;
  distanceKm?: number;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const STATUS_STYLES: Record<ParkingLotStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-red-100 text-red-700',
};

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function ParkingCard({
  lot,
  selected,
  distanceKm,
  onSelect,
  onViewOnMap,
  onViewDetails,
}: ParkingCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      onClick={() => onSelect(lot.id)}
      className={`cursor-pointer rounded-2xl border bg-white p-5 transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900">
            {lot.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {lot.city} · {lot.address}
          </p>
          {distanceKm !== undefined && (
            <p className="mt-1 text-xs text-slate-400">
              {formatDistance(distanceKm)} away
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[lot.status]}`}
        >
          {lot.status}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-slate-900">
            ₹{lot.pricePerHour}
            <span className="text-sm font-medium text-slate-500">/hr</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">
            <span
              className={
                lot.availableSpaces === 0 ? 'text-red-600' : 'text-emerald-600'
              }
            >
              {lot.availableSpaces}
            </span>
            <span className="text-slate-400"> / {lot.totalSpaces} spaces</span>
          </p>
          <p className="text-xs text-slate-400">
            {lot.availableSpaces === 0
              ? 'Full'
              : lot.availableSpaces <= lot.totalSpaces * 0.25
                ? 'Limited'
                : 'Available'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails(lot.id);
          }}
          className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          View Details
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onViewOnMap(lot.id);
          }}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          View on Map
        </button>
      </div>
    </div>
  );
}
