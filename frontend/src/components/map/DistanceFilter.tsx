import { formatDistanceKm } from '../../utils/distance';

interface DistanceFilterProps {
  radiusKm: number;
  onChange: (radiusKm: number) => void;
  visibleCount: number;
  totalCount: number;
  variant?: 'card' | 'inline';
}

export default function DistanceFilter({
  radiusKm,
  onChange,
  visibleCount,
  totalCount,
  variant = 'card',
}: DistanceFilterProps) {
  if (variant === 'inline') {
    return (
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label
            htmlFor="distance-slider"
            className="shrink-0 text-sm font-semibold text-[var(--pm-color-text)]"
          >
            Search radius
          </label>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {formatDistanceKm(radiusKm)}
          </span>
          <input
            id="distance-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={radiusKm}
            onChange={(event) => onChange(Number(event.target.value))}
            className="h-2 min-w-[140px] flex-1 cursor-pointer appearance-none rounded-full bg-[var(--pm-color-border-strong)] accent-emerald-600 sm:min-w-[200px] lg:min-w-[280px]"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={radiusKm}
          />
          <p className="w-full text-xs text-[var(--pm-color-muted)] sm:w-auto sm:text-sm">
            <span className="font-semibold text-[var(--pm-color-text)]">{visibleCount}</span> of{' '}
            <span className="font-semibold text-[var(--pm-color-text)]">{totalCount}</span> lots
            {radiusKm > 0 ? ` within ${formatDistanceKm(radiusKm)}` : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--pm-color-surface)] p-4 shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="distance-slider-card" className="text-sm font-semibold text-[var(--pm-color-text)]">
          Search radius
        </label>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          {formatDistanceKm(radiusKm)}
        </span>
      </div>

      <input
        id="distance-slider-card"
        type="range"
        min={0}
        max={100}
        step={1}
        value={radiusKm}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--pm-color-border-strong)] accent-emerald-600"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={radiusKm}
      />

      <div className="mt-2 flex justify-between text-xs text-[var(--pm-color-muted)]">
        <span>0 km</span>
        <span>100 km</span>
      </div>

      <p className="mt-4 text-sm text-[var(--pm-color-muted)]">
        Showing{' '}
        <span className="font-semibold text-[var(--pm-color-text)]">{visibleCount}</span> of{' '}
        <span className="font-semibold text-[var(--pm-color-text)]">{totalCount}</span> parking lots
        {radiusKm > 0 ? ` within ${formatDistanceKm(radiusKm)}` : ''}
      </p>
    </div>
  );
}
