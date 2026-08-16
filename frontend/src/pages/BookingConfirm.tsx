import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import BookingSummary from '../components/booking/BookingSummary';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { fetchBooking } from '../services/bookings';
import type { Booking } from '../types/booking';

export default function BookingConfirm() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    fetchBooking(id)
      .then((result) => {
        if (active) setBooking(result);
      })
      .catch(() => {
        if (active) setError('We could not find this booking.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-emerald-600" />
          </div>
        ) : error || !booking ? (
          <Alert variant="error" message={error ?? 'Booking not found.'} />
        ) : (
          <div>
            <div className="rounded-2xl bg-emerald-600 p-6 text-white">
              <h1 className="text-2xl font-bold">Booking confirmed!</h1>
              <p className="mt-1 text-sm text-emerald-100">
                Check in within {new Date(booking.checkInDeadline).toLocaleString()} to keep
                your spot at {booking.parkingLot.name}.
              </p>
            </div>

            <div className="mt-6">
              <BookingSummary booking={booking} />
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
              <h2 className="text-sm font-bold text-emerald-900">What happens next</h2>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-emerald-800">
                <li>Head to the parking lot before your check-in deadline.</li>
                <li>Check in when you arrive — your paid session timer starts then.</li>
                <li>Check out when you leave — your final amount is calculated on time used.</li>
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={`/parking/${booking.parkingLotId}`} className="flex-1">
                <Button variant="secondary">Back to parking</Button>
              </Link>
              <Link to="/bookings" className="flex-1">
                <Button>View my bookings</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
