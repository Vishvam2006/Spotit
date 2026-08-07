import { useEffect, useRef } from 'react';
import { ArrowRight, MapPinned, Navigation } from 'lucide-react';
import type { ParkingLot, ParkingLotStatus } from '../../types';
import { getMarkerTone, MARKER_COLORS } from '../map/parkingMarkerColor';

interface ParkingCardProps {
  lot: ParkingLot;
  selected: boolean;
  distanceKm?: number;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const STATUS_STYLES: Record<ParkingLotStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-[#22C55E]',
  INACTIVE: 'bg-amber-50 text-[#F59E0B]',
  CLOSED: 'bg-red-50 text-[#EF4444]',
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

  const markerTone = getMarkerTone(lot);

  return (
    <div
      ref={ref}
      onClick={() => onSelect(lot.id)}
      className={`cursor-pointer rounded-[20px] border bg-white p-4 transition-all duration-200 sm:p-5 ${
        selected
          ? 'border-[#19C7B2] shadow-[0_16px_36px_rgb(15_23_42_/_0.12)] ring-4 ring-teal-50'
          : 'border-[#E2E8F0] shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_32px_rgb(15_23_42_/_0.10)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[#0F172A]">
            {lot.name}
          </h3>
          <p className="mt-1 truncate text-sm text-[#64748B]">
            {lot.city} · {lot.address}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#64748B]">
            <Navigation className="h-4 w-4 text-[#19C7B2]" />
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: MARKER_COLORS[markerTone] }}
            />
            {distanceKm !== undefined
              ? `${formatDistance(distanceKm)} away`
              : 'Distance unavailable'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[lot.status]}`}
        >
          {lot.status}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#64748B]">Price</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">
            ₹{lot.pricePerHour}
            <span className="text-sm font-semibold text-[#64748B]">/hr</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[#64748B]">Spaces</p>
          <p className="mt-1 text-lg font-bold text-[#0F172A]">
            <span
              className={
                lot.availableSpaces === 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
              }
            >
              {lot.availableSpaces}
            </span>
            <span className="text-[#64748B]"> / {lot.totalSpaces}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails(lot.id);
          }}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#19C7B2] px-4 py-3 text-sm font-bold text-[#0B1220] transition-all duration-200 hover:bg-[#0E9F94] hover:text-white focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onViewOnMap(lot.id);
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] transition-all duration-200 hover:bg-[#F8FAFC] focus:outline-none focus:ring-4 focus:ring-teal-100"
          title="View on map"
          aria-label={`View ${lot.name} on map`}
        >
          <MapPinned className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
