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
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    NOT_CHARGED: 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] ring-[var(--pm-color-border)]',
    REFUNDED: 'bg-sky-50 text-sky-700 ring-sky-200',
    REFUND_PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  const cls = styles[status] ?? 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] ring-[var(--pm-color-border)]';
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
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-[var(--pm-color-text)]">Recent bookings</h2>
        <p className="mt-0.5 text-sm text-[var(--pm-color-muted)]">
          Latest transactions across your parking lots.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-[var(--pm-color-muted)]">No bookings yet.</p>
      ) : (
        <>
          {/* Mobile: one card per booking. An 8-column table cannot be read on a
              phone, and horizontal scrolling hides the amount and status. */}
          <ul className="divide-y divide-[var(--pm-color-border)] md:hidden">
            {bookings.map((booking) => (
              <li key={booking.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--pm-color-text)]">
                      {booking.vehicleNumber}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[var(--pm-color-muted)]">
                      {booking.customerName}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-[var(--pm-color-text)]">
                    {booking.amount !== null ? formatINR(booking.amount) : '—'}
                  </p>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="min-w-0">
                    <dt className="text-[var(--pm-color-muted)]">Start</dt>
                    <dd className="truncate text-[var(--pm-color-muted)]">
                      {formatDateTime(booking.startTime)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[var(--pm-color-muted)]">End</dt>
                    <dd className="truncate text-[var(--pm-color-muted)]">
                      {booking.endTime ? formatDateTime(booking.endTime) : '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[var(--pm-color-muted)]">Duration</dt>
                    <dd className="text-[var(--pm-color-muted)]">
                      {formatDuration(booking.durationMinutes)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  <PaymentBadge status={booking.paymentStatus} />
                </div>
              </li>
            ))}
          </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
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
            <tbody className="divide-y divide-[var(--pm-color-border)]">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-[var(--pm-color-surface-raised)]">
                  <td className="px-5 py-3 font-semibold text-[var(--pm-color-text)]">
                    {booking.vehicleNumber}
                  </td>
                  <td className="px-4 py-3 text-[var(--pm-color-muted)]">{booking.customerName}</td>
                  <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                    {formatDateTime(booking.startTime)}
                  </td>
                  <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                    {booking.endTime ? formatDateTime(booking.endTime) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                    {formatDuration(booking.durationMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--pm-color-text)]">
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
        </>
      )}
    </div>
  );
}