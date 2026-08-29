import { MapPin, Navigation, Clock } from 'lucide-react';
import ConfidenceBadge from '../continuity/ConfidenceBadge';
import type { ParkingLot } from '../../types/parking';
import { formatDistanceKm } from '../../utils/distance';
import { getMarkerAvailability } from '../../utils/markerAvailability';
import { formatLastUpdated } from '../../utils/format';

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
  gray: 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)]',
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
          : 'border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] shadow-sm hover:border-[var(--pm-color-border-strong)] hover:bg-[var(--pm-color-surface-raised)]'
      }`}
    >
      {imageUrl && (
        <div className="-mx-4 -mt-4 mb-4 aspect-video overflow-hidden rounded-t-xl bg-[var(--pm-color-surface-raised)]">
          <img src={imageUrl} alt={parking.name} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[var(--pm-color-text)]">
            {parking.name}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-sm text-[var(--pm-color-muted)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {parking.address}, {parking.city}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ConfidenceBadge
              confidence={parking.availabilityConfidence}
              size="sm"
            />
            {parking.updatedAt && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--pm-color-muted)]">
                <Clock className="h-3 w-3 shrink-0" />
                {formatLastUpdated(parking.updatedAt)}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badgeStyles[color]}`}
        >
          {label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-[var(--pm-color-muted)]">
        <div>
          <dt className="text-[var(--pm-color-muted)]">Price</dt>
          <dd className="mt-0.5 text-sm font-bold text-[var(--pm-color-text)]">₹{parking.pricePerHour}/hr</dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Slots</dt>
          <dd className="mt-0.5 text-sm font-bold text-[var(--pm-color-text)]">
            {parking.availableSpaces}/{parking.totalSpaces}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Distance</dt>
          <dd className="mt-0.5 text-sm font-bold text-[var(--pm-color-text)]">
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
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--pm-color-text)] px-3 text-sm font-bold text-[var(--pm-color-page)] transition-colors hover:bg-[var(--pm-color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Reserve spot
          <Navigation className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
