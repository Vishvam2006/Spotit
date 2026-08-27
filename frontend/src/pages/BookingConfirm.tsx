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
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Payment Successful!</h1>
                  <p className="mt-0.5 text-sm text-emerald-100">
                    Booking confirmed — your spot is reserved.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-emerald-100">
                Check in before {new Date(booking.checkInDeadline).toLocaleString()} to keep
                your spot at {booking.parkingLot.name}.
              </p>
            </div>

            {booking.payment && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Payment Reference</p>
                    <p className="mt-0.5 text-sm font-mono text-emerald-900">{booking.payment.razorpayPaymentId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-emerald-700">Amount Paid</p>
                    <p className="mt-0.5 text-lg font-black text-emerald-900">
                      ₹{(booking.payment.amount / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
