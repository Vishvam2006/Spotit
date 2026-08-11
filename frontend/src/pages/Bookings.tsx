import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import BookingSummary from '../components/booking/BookingSummary';
import ArrivalCard from '../components/booking/ArrivalCard';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../services/api';
import { cancelBooking, fetchBookings } from '../services/bookings';
import { notifyError, notifySuccess } from '../utils/notify';
import type { Booking, BookingStatus } from '../types/booking';

const STATUS_GROUPS: { key: BookingStatus; label: string }[] = [
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'EXPIRED', label: 'Expired' },
];

const LIVE_STATUSES: BookingStatus[] = ['RESERVED', 'ACTIVE'];

const REFRESH_INTERVAL_MS = 30_000;

function groupByStatus(bookings: Booking[]): Record<BookingStatus, Booking[]> {
  const groups: Record<BookingStatus, Booking[]> = {
    RESERVED: [],
    ACTIVE: [],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: [],
  };

  for (const booking of bookings) {
    groups[booking.status]?.push(booking);
  }

  return groups;
}

export default function Bookings() {
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

  const hasLiveBookings = bookings.some((booking) => LIVE_STATUSES.includes(booking.status));

  useEffect(() => {
    if (!hasLiveBookings) return;
    const interval = setInterval(loadBookings, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasLiveBookings, loadBookings]);

  const handleBookingUpdated = useCallback((updated: Booking) => {
    setBookings((current) =>
      current.map((booking) => (booking.id === updated.id ? updated : booking)),
    );
  }, []);

  const handleExpired = useCallback(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (booking: Booking) => {
    setActionError(null);
    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id);
      notifySuccess('Booking cancelled. The space has been released.');
      loadBookings();
    } catch (err) {
      setActionError(getErrorMessage(err));
      notifyError(err);
    } finally {
      setCancellingId(null);
    }
  };

  const groups = groupByStatus(bookings);

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
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
          <div className="mt-6 space-y-8">
            {STATUS_GROUPS.map(({ key, label }) => {
              const groupBookings = groups[key];
              if (groupBookings.length === 0) return null;

              return (
                <section key={key}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                      {label}
                    </h2>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {groupBookings.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-4">
                    {groupBookings.map((booking) => (
                      <div key={booking.id}>
                        {LIVE_STATUSES.includes(booking.status) ? (
                          <ArrivalCard
                            booking={booking}
                            onBookingUpdated={handleBookingUpdated}
                            onExpired={handleExpired}
                          />
                        ) : (
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
                </section>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
