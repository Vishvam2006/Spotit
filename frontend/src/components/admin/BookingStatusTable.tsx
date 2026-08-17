import BookingStatusBadge from './BookingStatusBadge';
import { formatDateTime } from '../../utils/format';
import type { AdminBooking } from '../../types/admin';

interface BookingStatusTableProps {
  bookings: AdminBooking[];
  loading?: boolean;
  error?: string | null;
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function vehicleTypeLabel(type: AdminBooking['vehicleType']): string {
  return type === 'TWO_WHEELER' ? '2-wheeler' : '4-wheeler';
}

export default function BookingStatusTable({
  bookings,
  loading,
  error,
}: BookingStatusTableProps) {
  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]"
          />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    if (error) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-8 text-center">
          <p className="font-semibold text-[var(--pm-color-text)]">
            Unable to load bookings
          </p>
          <p className="mt-1 text-sm text-[var(--pm-color-muted)]">{error}</p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-8 text-center">
        <p className="font-semibold text-[var(--pm-color-text)]">
          No bookings
        </p>
        <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
          No bookings match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <ul className="divide-y divide-[var(--pm-color-border)] md:hidden">
        {bookings.map((booking) => (
          <li key={booking.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--pm-color-text)]">
                  {booking.user.fullName}
                </p>
                <p className="mt-0.5 truncate font-mono text-sm text-[var(--pm-color-muted)]">
                  {booking.vehicleNumber}
                </p>
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-2 truncate text-sm text-[var(--pm-color-muted)]">
              {booking.parkingLot.name}
              {booking.parkingLot.owner
                ? ` · ${booking.parkingLot.owner.fullName}`
                : ''}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="min-w-0">
                <dt className="text-[var(--pm-color-muted)]">Booking date</dt>
                <dd className="truncate text-[var(--pm-color-muted)]">
                  {formatDateTime(booking.createdAt)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[var(--pm-color-muted)]">Time</dt>
                <dd className="truncate text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkInTime ?? booking.reservedAt)} –{' '}
                  {formatTime(booking.sessionEndsAt ?? booking.checkOutTime)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[var(--pm-color-muted)]">Check-in</dt>
                <dd className="text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkInTime)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[var(--pm-color-muted)]">Check-out</dt>
                <dd className="text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkOutTime)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Parking</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Booking Date</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pm-color-border)]">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-[var(--pm-color-surface-raised)]">
                <td className="max-w-40 px-4 py-3">
                  <span className="block truncate font-mono text-xs text-[var(--pm-color-muted)]">
                    {booking.id}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--pm-color-text)]">
                  {booking.user.fullName}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  <p className="font-semibold text-[var(--pm-color-text)]">
                    {booking.vehicleNumber}
                  </p>
                  <p className="text-xs">{vehicleTypeLabel(booking.vehicleType)}</p>
                </td>
                <td className="max-w-44 px-4 py-3 text-[var(--pm-color-muted)]">
                  <span className="block truncate">{booking.parkingLot.name}</span>
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {booking.parkingLot.owner?.fullName ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">—</td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatDateTime(booking.createdAt)}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkInTime ?? booking.reservedAt)}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatTime(booking.sessionEndsAt ?? booking.checkOutTime)}
                </td>
                <td className="px-4 py-3">
                  <BookingStatusBadge status={booking.status} />
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkInTime)}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatTime(booking.checkOutTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}