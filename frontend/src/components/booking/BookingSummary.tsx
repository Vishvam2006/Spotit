import type { Booking } from '../../types/booking';
import { formatDateTime, formatINR } from '../../utils/format';
import { getBookingStatusLabel, getBookingStatusStyles } from '../../utils/bookingStatus';
import VehicleDetails from '../vehicle/VehicleDetails';
import SmartSuggest from './SmartSuggest';
import CompleteReassignmentPaymentBanner from './CompleteReassignmentPaymentBanner';

interface BookingSummaryProps {
  booking: Booking;
  onRefresh?: () => void;
}

export default function BookingSummary({ booking, onRefresh }: BookingSummaryProps) {
  const amount =
    booking.status === 'COMPLETED' && booking.finalAmount !== null
      ? booking.finalAmount
      : booking.estimatedAmount;
  const parkingImageUrl = booking.parkingLot.photos?.[0] ?? booking.parkingLot.imageUrl;

  const wasChargedAndUnfulfilled =
    (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') &&
    Boolean(booking.payment);
  const refundStatus = booking.payment?.status;

  // Auto-Reassignment: once an alternative has been held (or accepted/
  // auto-accepted), don't also show SmartSuggest's manual pick-one-yourself
  // panel on the cancelled original -- only show it once there is truly
  // nothing else in play (no reassignment ever attempted, or it was declined).
  const reassignment = booking.reassignment;
  const hasActiveReassignment =
    reassignment?.role === 'ORIGINAL' &&
    (reassignment.status === 'PENDING' ||
      reassignment.status === 'ACCEPTED' ||
      reassignment.status === 'AUTO_ACCEPTED');

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
          {getBookingStatusLabel(booking.status)}
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

      {wasChargedAndUnfulfilled && (
        <div
          className={`mx-6 mt-4 rounded-xl p-4 text-sm ring-1 ${
            refundStatus === 'REFUNDED'
              ? 'bg-sky-50 text-sky-800 ring-sky-100'
              : 'bg-amber-50 text-amber-900 ring-amber-100'
          }`}
        >
          {refundStatus === 'REFUNDED' ? (
            <p>Your payment for this booking has been refunded.</p>
          ) : (
            <p>
              Your payment for this booking is being refunded to your original
              payment method. This can take a few days to reflect.
            </p>
          )}
        </div>
      )}

      {hasActiveReassignment && (
        <div className="mx-6 mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {reassignment!.status === 'PENDING' ? (
            <p>
              <span className="font-semibold">We've automatically held a nearby spot for you.</span>{' '}
              Check the popup on your screen to accept or decline it.
            </p>
          ) : (
            <p>
              <span className="font-semibold">You've been moved to a new spot.</span> Check your
              Bookings for the new reservation.
            </p>
          )}
        </div>
      )}

      <CompleteReassignmentPaymentBanner booking={booking} onPaid={() => onRefresh?.()} />

      {booking.status === 'DISPUTED' && (
        <div className="mx-6 mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          <p className="font-semibold">This booking is protected.</p>
          <p className="mt-1">
            You reported an issue with this parking lot, so we kept the booking on
            record as evidence instead of deleting it. The parking owner and our
            team can both see your report, and the space you paid to hold has been
            released back to the lot.
          </p>
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

      {booking.status === 'CANCELLED' &&
        booking.cancellationReason === 'PARKING_DEACTIVATED' &&
        !hasActiveReassignment && (
          <div className="px-6 pb-6">
            <SmartSuggest booking={booking} />
          </div>
        )}
    </div>
  );
}
