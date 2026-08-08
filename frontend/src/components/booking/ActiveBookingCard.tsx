import { useState } from 'react';
import type { Booking } from '../../types/booking';
import { formatDateTime, formatINR } from '../../utils/format';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { getErrorMessage } from '../../services/api';

interface ActiveBookingCardProps {
  booking: Booking;
  onCheckOut: () => void;
}

export default function ActiveBookingCard({ booking, onCheckOut }: ActiveBookingCardProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckOut = async () => {
    setError(null);
    setCheckingOut(true);
    try {
      await onCheckOut();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-emerald-900">{booking.parkingLot.name}</h3>
          <p className="mt-0.5 text-sm text-emerald-700">{booking.parkingLot.address}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getBookingStatusStyles(
            booking.status,
          )}`}
        >
          {booking.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-emerald-700/70">Vehicle</dt>
          <dd className="font-semibold text-emerald-900">{booking.vehicleNumber}</dd>
        </div>
        <div>
          <dt className="text-emerald-700/70">Checked in</dt>
          <dd className="font-semibold text-emerald-900">
            {booking.checkInTime ? formatDateTime(booking.checkInTime) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-emerald-700/70">Estimated</dt>
          <dd className="font-semibold text-emerald-900">
            {formatINR(booking.estimatedAmount)}
          </dd>
        </div>
      </dl>

      {error && (
        <div className="mt-4">
          <Alert variant="error" message={error} />
        </div>
      )}

      <Button className="mt-5" onClick={handleCheckOut} loading={checkingOut}>
        Check out & pay
      </Button>
    </div>
  );
}
