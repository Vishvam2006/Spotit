import type { Booking } from '../../types/booking';
import { formatDateTime, formatINR } from '../../utils/format';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import VehicleDetails from '../vehicle/VehicleDetails';
import SmartSuggest from './SmartSuggest';

interface BookingSummaryProps {
  booking: Booking;
}

export default function BookingSummary({ booking }: BookingSummaryProps) {
  const amount =
    booking.status === 'COMPLETED' && booking.finalAmount !== null
      ? booking.finalAmount
      : booking.estimatedAmount;
  const parkingImageUrl = booking.parkingLot.photos?.[0] ?? booking.parkingLot.imageUrl;

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      {parkingImageUrl && (
        <div className="aspect-video bg-[var(--pm-color-surface-raised)]">
          <img
            src={parkingImageUrl}
            alt={booking.parkingLot.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div>
          <h3 className="text-lg font-bold text-[var(--pm-color-text)]">{booking.parkingLot.name}</h3>
          <p className="mt-0.5 text-sm text-[var(--pm-color-muted)]">{booking.parkingLot.address}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getBookingStatusStyles(
            booking.status,
          )}`}
        >
          {booking.status}
        </span>
      </div>

      {booking.status === 'CANCELLED' && booking.cancellationReason === 'PARKING_DEACTIVATED' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <span className="font-semibold">Booking cancelled.</span>
          <span>
            This booking was cancelled because the parking owner deactivated this location.
          </span>
        </div>
      )}

      <dl className="grid gap-3 p-6 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-[var(--pm-color-muted)]">Vehicle</dt>
          <dd className="mt-1.5">
            <VehicleDetails vehicle={booking.vehicle} />
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Booking ID</dt>
          <dd className="truncate font-mono text-xs font-semibold text-[var(--pm-color-text)]">
            {booking.id}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Reserved at</dt>
          <dd className="font-semibold text-[var(--pm-color-text)]">{formatDateTime(booking.reservedAt)}</dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Check in by</dt>
          <dd className="font-semibold text-[var(--pm-color-text)]">
            {formatDateTime(booking.checkInDeadline)}
          </dd>
        </div>
        {booking.status === 'ACTIVE' && booking.sessionEndsAt && (
          <div>
            <dt className="text-[var(--pm-color-muted)]">Session ends</dt>
            <dd className="font-semibold text-[var(--pm-color-text)]">
              {formatDateTime(booking.sessionEndsAt)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--pm-color-muted)]">Duration</dt>
          <dd className="font-semibold text-[var(--pm-color-text)]">
            {booking.durationMinutes} min
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">Rate</dt>
          <dd className="font-semibold text-[var(--pm-color-text)]">
            {formatINR(booking.parkingLot.pricePerHour)}/hr
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pm-color-muted)]">
            {booking.status === 'COMPLETED' ? 'Final amount' : 'Estimated amount'}
          </dt>
          <dd className="font-semibold text-[var(--pm-color-text)]">{formatINR(amount)}</dd>
        </div>
      </dl>

      {booking.status === 'CANCELLED' && booking.cancellationReason === 'PARKING_DEACTIVATED' && (
        <div className="px-6 pb-6">
          <SmartSuggest booking={booking} />
        </div>
      )}
    </div>
  );
}
