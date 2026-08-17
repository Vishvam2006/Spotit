import type { ParkingSlot, SlotStatus } from '../../types/owner';

interface SlotGridProps {
  slots: ParkingSlot[];
  loading?: boolean;
}

const STATUS_STYLES: Record<SlotStatus, { box: string; label: string; dot: string }> = {
  AVAILABLE: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: 'Available',
    dot: 'bg-emerald-500',
  },
  OCCUPIED: {
    box: 'border-red-200 bg-red-50 text-red-700',
    label: 'Occupied',
    dot: 'bg-red-500',
  },
  RESERVED: {
    box: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Reserved',
    dot: 'bg-amber-500',
  },
};

const LEGEND: { status: SlotStatus; label: string }[] = [
  { status: 'AVAILABLE', label: 'Available' },
  { status: 'OCCUPIED', label: 'Occupied' },
  { status: 'RESERVED', label: 'Reserved (not arrived)' },
];

export default function SlotGrid({ slots, loading }: SlotGridProps) {
  return (
    <div>
<div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[var(--pm-color-muted)]">
          <span className="font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">Live slots</span>
        {LEGEND.map((entry) => (
          <span key={entry.status} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[entry.status].dot}`} />
            {entry.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {slots.map((slot) => {
            const styles = STATUS_STYLES[slot.status];
            return (
              <div
                key={slot.slot}
                className={`rounded-lg border px-1 py-2 text-center ${styles.box}`}
                title={`${slot.slot} — ${styles.label}`}
              >
                <span className="block text-xs font-bold">{slot.slot}</span>
                <span className={`mx-auto mt-1 block h-2 w-2 rounded-full ${styles.dot}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}