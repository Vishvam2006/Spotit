import type { Booking } from '../../types/booking';
import { formatDateTime, formatINR } from '../../utils/format';
import { getBookingStatusStyles } from '../../utils/bookingStatus';

interface BookingSummaryProps {
  booking: Booking;
}

export default function BookingSummary({ booking }: BookingSummaryProps) {
  const amount =
    booking.status === 'COMPLETED' && booking.finalAmount !== null
      ? booking.finalAmount
      : booking.estimatedAmount;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
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

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">Vehicle</dt>
          <dd className="font-semibold text-slate-900">{booking.vehicleNumber}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Booking ID</dt>
          <dd className="truncate font-mono text-xs font-semibold text-slate-900">
            {booking.id}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Starts</dt>
          <dd className="font-semibold text-slate-900">{formatDateTime(booking.startTime)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Reserved until</dt>
          <dd className="font-semibold text-slate-900">
            {formatDateTime(booking.reservedUntil)}
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
