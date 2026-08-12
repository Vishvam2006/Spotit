import type { Booking } from '../../types/booking';
import { formatDateTime, formatINR } from '../../utils/format';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import VehicleDetails from '../vehicle/VehicleDetails';

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
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {parkingImageUrl && (
        <div className="aspect-video bg-slate-100">
          <img
            src={parkingImageUrl}
            alt={booking.parkingLot.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{booking.parkingLot.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{booking.parkingLot.address}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getBookingStatusStyles(
            booking.status,
          )}`}
        >
          {booking.status}
        </span>
      </div>

      <dl className="grid gap-3 p-6 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-slate-400">Vehicle</dt>
          <dd className="mt-1.5">
            <VehicleDetails vehicle={booking.vehicle} />
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Booking ID</dt>
          <dd className="truncate font-mono text-xs font-semibold text-slate-900">
            {booking.id}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Reserved at</dt>
          <dd className="font-semibold text-slate-900">{formatDateTime(booking.reservedAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Check in by</dt>
          <dd className="font-semibold text-slate-900">
            {formatDateTime(booking.checkInDeadline)}
          </dd>
        </div>
        {booking.status === 'ACTIVE' && booking.sessionEndsAt && (
          <div>
            <dt className="text-slate-400">Session ends</dt>
            <dd className="font-semibold text-slate-900">
              {formatDateTime(booking.sessionEndsAt)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-slate-400">Duration</dt>
          <dd className="font-semibold text-slate-900">
            {booking.durationMinutes} min
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Rate</dt>
          <dd className="font-semibold text-slate-900">
            {formatINR(booking.parkingLot.pricePerHour)}/hr
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">
            {booking.status === 'COMPLETED' ? 'Final amount' : 'Estimated amount'}
          </dt>
          <dd className="font-semibold text-slate-900">{formatINR(amount)}</dd>
        </div>
      </dl>
    </div>
  );
}
