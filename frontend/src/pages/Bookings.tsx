import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import BookingSummary from '../components/booking/BookingSummary';
import ActiveBookingCard from '../components/booking/ActiveBookingCard';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../services/api';
import { cancelBooking, checkOutBooking, fetchBookings } from '../services/bookings';
import type { Booking } from '../types/booking';

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(() => {
    let active = true;

    fetchBookings()
      .then((result) => {
        if (active) setBookings(result);
      })
      .catch(() => {
        if (active) setError('Failed to load bookings. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadBookings(), [loadBookings]);

  const activeBooking = bookings.find((booking) => booking.status === 'ACTIVE');

  const handleCheckOut = async () => {
    if (!activeBooking) return;
    setActionError(null);
    await checkOutBooking(activeBooking.id);
    loadBookings();
  };

  const handleCancel = async (booking: Booking) => {
    setActionError(null);
    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id);
      loadBookings();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">ParkMitra</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to map
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">Reserve, check in, and manage your parking.</p>

        {actionError && (
          <div className="mt-5">
            <Alert variant="error" message={actionError} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : error ? (
          <div className="mt-5">
            <Alert variant="error" message={error} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">You have no bookings yet.</p>
            <Link to="/" className="mt-4 block">
              <Button className="mx-auto max-w-xs">Find a parking spot</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {activeBooking && (
              <ActiveBookingCard booking={activeBooking} onCheckOut={handleCheckOut} />
            )}

            {bookings.map((booking) => (
              <div key={booking.id}>
                {booking.status !== 'ACTIVE' && (
                  <BookingSummary booking={booking} />
                )}

                {booking.status === 'RESERVED' && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => handleCancel(booking)}
                      loading={cancellingId === booking.id}
                      className="max-w-40"
                    >
                      Cancel booking
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
