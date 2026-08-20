import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { OwnerParkingCard, OwnerParkingStatus } from '../../types/owner';
import { formatINR } from '../../utils/format';
import SlotGrid from './SlotGrid';
import ConfidenceBadge from '../continuity/ConfidenceBadge';

interface ParkingStatusTableProps {
  parkings: OwnerParkingCard[];
  statuses: Record<string, OwnerParkingStatus | undefined>;
  expandedIds: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
}

const STATUS_PILL: Record<OwnerParkingCard['status'], { label: string; cls: string }> = {
  OPERATING: {
    label: '🟢 Operating',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  FULL: {
    label: '🔴 Full',
    cls: 'bg-red-50 text-red-700 ring-red-200',
  },
  CLOSED: {
    label: '🟡 Closed',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  UNDER_REVIEW: {
    label: '🔴 Under review',
    cls: 'bg-red-50 text-red-700 ring-red-200',
  },
};

export default function ParkingStatusTable({
  parkings,
  statuses,
  expandedIds,
  onToggle,
  loading,
}: ParkingStatusTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-[var(--pm-color-text)]">Parking locations</h2>
        <p className="mt-0.5 text-sm text-[var(--pm-color-muted)]">
          Live status of every parking you own. Expand to see each slot.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]" />
          ))}
        </div>
      ) : parkings.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-[var(--pm-color-muted)]">
          You have not created any parking lots yet.
        </p>
      ) : (
        <>
          {/* Mobile: card per lot with the slot grid expanding inline. */}
          <ul className="divide-y divide-[var(--pm-color-border)] md:hidden">
            {parkings.map((parking) => {
              const isExpanded = expandedIds.includes(parking.id);
              const pill = STATUS_PILL[parking.status];
              const detail = statuses[parking.id];

              return (
                <li key={parking.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--pm-color-text)]">{parking.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--pm-color-muted)]">
                        {parking.location}
                      </p>
                      <ConfidenceBadge
                        confidence={parking.availabilityConfidence}
                        size="sm"
                        className="mt-2"
                      />
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill.cls}`}
                    >
                      {pill.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-[var(--pm-color-surface-raised)] p-3 text-center">
                    <div>
                      <p className="text-[11px] text-[var(--pm-color-muted)]">Occupied</p>
                      <p className="mt-0.5 font-semibold text-[var(--pm-color-text)]">
                        {parking.occupiedSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--pm-color-muted)]">Free</p>
                      <p className="mt-0.5 font-semibold text-[var(--pm-color-text)]">
                        {parking.availableSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--pm-color-muted)]">Slots</p>
                      <p className="mt-0.5 font-semibold text-[var(--pm-color-muted)]">
                        {parking.totalSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--pm-color-muted)]">Revenue</p>
                      <p className="mt-0.5 truncate font-semibold text-[var(--pm-color-text)]">
                        {formatINR(parking.revenueGenerated)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggle(parking.id)}
                    aria-expanded={isExpanded}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {isExpanded ? (
                      <>
                        Hide slots
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        View slots
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-xl bg-[var(--pm-color-surface-raised)]/60 p-3">
                      <SlotGrid slots={detail?.slots ?? []} loading={!detail} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
                <th className="px-5 py-3">Parking</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">Occupied</th>
                <th className="px-4 py-3 text-center">Available</th>
                <th className="px-4 py-3 text-center">Slots</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pm-color-border)]">
              {parkings.map((parking) => {
                const isExpanded = expandedIds.includes(parking.id);
                const pill = STATUS_PILL[parking.status];
                const detail = statuses[parking.id];

                return (
                  <Fragment key={parking.id}>
                    <tr className="hover:bg-[var(--pm-color-surface-raised)]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[var(--pm-color-text)]">{parking.name}</p>
                        <p className="text-xs text-[var(--pm-color-muted)]">{parking.city}</p>
                        <ConfidenceBadge
                          confidence={parking.availabilityConfidence}
                          size="sm"
                          className="mt-1.5"
                        />
                      </td>
                      <td className="px-4 py-3 text-[var(--pm-color-muted)]">{parking.location}</td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--pm-color-text)]">
                        {parking.occupiedSlots}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--pm-color-text)]">
                        {parking.availableSlots}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--pm-color-muted)]">
                        {parking.totalSlots}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--pm-color-text)]">
                        {formatINR(parking.revenueGenerated)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill.cls}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onToggle(parking.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {isExpanded ? (
                            <>
                              Hide
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Slots
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${parking.id}-slots`}>
                        <td colSpan={8} className="bg-[var(--pm-color-surface-raised)]/60 px-5 py-4">
                          <SlotGrid slots={detail?.slots ?? []} loading={!detail} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}