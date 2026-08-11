import type { OwnerBookingRow } from '../../types/owner';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import { formatDateTime, formatINR } from '../../utils/format';

interface BookingsTableProps {
  bookings: OwnerBookingRow[];
  loading?: boolean;
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    PENDING: 'bg-blue-50 text-blue-700 ring-blue-200',
    NOT_CHARGED: 'bg-slate-100 text-slate-500 ring-slate-200',
  };
  const cls = styles[status] ?? 'bg-slate-100 text-slate-500 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function BookingStatusBadge({ status }: { status: OwnerBookingRow['status'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getBookingStatusStyles(status)}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export default function BookingsTable({ bookings, loading }: BookingsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Recent bookings</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Latest transactions across your parking lots.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-500">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Vehicle Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {booking.vehicleNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{booking.customerName}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(booking.startTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {booking.endTime ? formatDateTime(booking.endTime) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDuration(booking.durationMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {booking.amount !== null ? formatINR(booking.amount) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={booking.paymentStatus} />
                  </td>
                  <td className="px-5 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}