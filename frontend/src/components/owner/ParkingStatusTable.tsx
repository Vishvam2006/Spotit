import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { OwnerParkingCard, OwnerParkingStatus } from '../../types/owner';
import { formatINR } from '../../utils/format';
import SlotGrid from './SlotGrid';

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
};

export default function ParkingStatusTable({
  parkings,
  statuses,
  expandedIds,
  onToggle,
  loading,
}: ParkingStatusTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Parking locations</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Live status of every parking you own. Expand to see each slot.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : parkings.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-500">
          You have not created any parking lots yet.
        </p>
      ) : (
        <>
          {/* Mobile: card per lot with the slot grid expanding inline. */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {parkings.map((parking) => {
              const isExpanded = expandedIds.includes(parking.id);
              const pill = STATUS_PILL[parking.status];
              const detail = statuses[parking.id];

              return (
                <li key={parking.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{parking.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {parking.location}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill.cls}`}
                    >
                      {pill.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="text-[11px] text-slate-400">Occupied</p>
                      <p className="mt-0.5 font-semibold text-slate-900">
                        {parking.occupiedSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Free</p>
                      <p className="mt-0.5 font-semibold text-slate-900">
                        {parking.availableSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Slots</p>
                      <p className="mt-0.5 font-semibold text-slate-600">
                        {parking.totalSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Revenue</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-900">
                        {formatINR(parking.revenueGenerated)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggle(parking.id)}
                    aria-expanded={isExpanded}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
                    <div className="mt-3 rounded-xl bg-slate-50/60 p-3">
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
              <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            <tbody className="divide-y divide-slate-100">
              {parkings.map((parking) => {
                const isExpanded = expandedIds.includes(parking.id);
                const pill = STATUS_PILL[parking.status];
                const detail = statuses[parking.id];

                return (
                  <Fragment key={parking.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{parking.name}</p>
                        <p className="text-xs text-slate-500">{parking.city}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{parking.location}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900">
                        {parking.occupiedSlots}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900">
                        {parking.availableSlots}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {parking.totalSlots}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        <td colSpan={8} className="bg-slate-50/60 px-5 py-4">
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