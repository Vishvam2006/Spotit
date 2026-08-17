import type { RevenueParkingRow } from '../../types/owner';
import { formatINR } from '../../utils/format';

interface RevenueTableProps {
  rows: RevenueParkingRow[];
  loading?: boolean;
}

export default function RevenueTable({ rows, loading }: RevenueTableProps) {
  const totals = rows.reduce(
    (acc, row) => ({
      total: acc.total + row.totalRevenue,
      today: acc.today + row.todayRevenue,
      monthly: acc.monthly + row.monthlyRevenue,
    }),
    { total: 0, today: 0, monthly: 0 },
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-[var(--pm-color-text)]">Revenue by parking lot</h2>
        <p className="mt-0.5 text-sm text-[var(--pm-color-muted)]">
          Earnings split across each of your parking lots.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-[var(--pm-color-muted)]">No revenue data yet.</p>
      ) : (
        <>
          {/* Mobile: card per lot, so revenue figures stay visible without
              horizontal scrolling. */}
          <ul className="divide-y divide-[var(--pm-color-border)] md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold text-[var(--pm-color-text)]">{row.name}</p>
                  <p className="shrink-0 font-semibold text-[var(--pm-color-text)]">
                    {formatINR(row.totalRevenue)}
                  </p>
                </div>
                <dl className="mt-2 flex gap-6 text-xs">
                  <div>
                    <dt className="text-[var(--pm-color-muted)]">Today</dt>
                    <dd className="mt-0.5 text-[var(--pm-color-muted)]">{formatINR(row.todayRevenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--pm-color-muted)]">This month</dt>
                    <dd className="mt-0.5 text-[var(--pm-color-muted)]">{formatINR(row.monthlyRevenue)}</dd>
                  </div>
                </dl>
              </li>
            ))}
            <li className="flex items-center justify-between bg-[var(--pm-color-surface-raised)]/60 px-5 py-3 font-semibold text-[var(--pm-color-text)]">
              <span>Total</span>
              <span>{formatINR(totals.total)}</span>
            </li>
          </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
                <th className="px-5 py-3">Parking</th>
                <th className="px-4 py-3 text-right">Today</th>
                <th className="px-4 py-3 text-right">This Month</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pm-color-border)]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--pm-color-surface-raised)]">
                  <td className="px-5 py-3 font-semibold text-[var(--pm-color-text)]">{row.name}</td>
                  <td className="px-4 py-3 text-right text-[var(--pm-color-muted)]">
                    {formatINR(row.todayRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--pm-color-muted)]">
                    {formatINR(row.monthlyRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-[var(--pm-color-text)]">
                    {formatINR(row.totalRevenue)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--pm-color-surface-raised)]/60 font-semibold text-[var(--pm-color-text)]">
                <td className="px-5 py-3">Total</td>
                <td className="px-4 py-3 text-right">{formatINR(totals.today)}</td>
                <td className="px-4 py-3 text-right">{formatINR(totals.monthly)}</td>
                <td className="px-5 py-3 text-right">{formatINR(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}