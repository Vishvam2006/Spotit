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
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Revenue by parking lot</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Earnings split across each of your parking lots.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-500">No revenue data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Parking</th>
                <th className="px-4 py-3 text-right">Today</th>
                <th className="px-4 py-3 text-right">This Month</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatINR(row.todayRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatINR(row.monthlyRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {formatINR(row.totalRevenue)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/60 font-semibold text-slate-900">
                <td className="px-5 py-3">Total</td>
                <td className="px-4 py-3 text-right">{formatINR(totals.today)}</td>
                <td className="px-4 py-3 text-right">{formatINR(totals.monthly)}</td>
                <td className="px-5 py-3 text-right">{formatINR(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}