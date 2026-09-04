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
import ReportIssueForm from '../components/continuity/ReportIssueForm';
import BookingTimeline from '../components/continuity/BookingTimeline';
import { useAuth } from '../context/auth-context';
import type { Booking, BookingStatus } from '../types/booking';

const LIVE_STATUSES: BookingStatus[] = ['RESERVED', 'ACTIVE'];

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Bookings are grouped into three tabs rather than one list per status, so the
 * booking a user is currently acting on is never buried under finished history.
 */
type TabKey = 'active' | 'upcoming' | 'reported' | 'past';

const TABS: { key: TabKey; label: string; statuses: BookingStatus[] }[] = [
  { key: 'active', label: 'Active', statuses: ['ACTIVE'] },
  { key: 'upcoming', label: 'Upcoming', statuses: ['RESERVED'] },
  // Disputed bookings get their own tab rather than being filed under "Past":
  // they are open cases the user is waiting on, not finished history.
  { key: 'reported', label: 'Reported', statuses: ['DISPUTED'] },
  { key: 'past', label: 'Past', statuses: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
];

/** Statuses the user may still file a report against. */
const REPORTABLE: BookingStatus[] = ['RESERVED', 'ACTIVE', 'COMPLETED', 'EXPIRED'];

export default function Bookings() {
  const { user, openAuthModal } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabKey | null>(null);
  const [reportingBooking, setReportingBooking] = useState<Booking | null>(null);
  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);

  const loadBookings = useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadBookings();
  }, [user, loadBookings]);

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

  const counts = TABS.reduce<Record<TabKey, number>>(
    (acc, tab) => {
      acc[tab.key] = bookings.filter((b) => tab.statuses.includes(b.status)).length;
      return acc;
    },
    { active: 0, upcoming: 0, reported: 0, past: 0 },
  );

  // Until the user picks a tab, show the most relevant one (an in-progress
  // session beats a reservation, which beats history) rather than defaulting to
  // an empty "Active". Derived instead of stored so no effect has to sync it.
  const activeTab = selectedTab ?? TABS.find((tab) => counts[tab.key] > 0)?.key ?? 'active';

  const activeTabDef = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];
  const visibleBookings = bookings.filter((booking) =>
    activeTabDef.statuses.includes(booking.status),
  );

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
        <h1 className="text-2xl font-bold text-[var(--pm-color-text)]">My Bookings</h1>
        <p className="mt-1 text-sm text-[var(--pm-color-muted)]">Reserve, check in, and manage your parking.</p>

        {actionError && (
          <div className="mt-5">
            <Alert variant="error" message={actionError} />
          </div>
        )}

        {!user ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-center max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-slate-900">Sign in to view your bookings</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Track live parking sessions, view countdown timers, and manage previous receipts seamlessly.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthModal({ title: 'Sign in to view Bookings', onSuccess: loadBookings })}
                className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all"
              >
                Sign In / Register
              </button>
              <Link
                to="/explore"
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all text-center"
              >
                Explore Map
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-emerald-600" />
          </div>
        ) : error ? (
          <div className="mt-5">
            <Alert variant="error" message={error} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)] p-10 text-center">
            <p className="text-sm text-[var(--pm-color-muted)]">You have no bookings yet.</p>
            <Link to="/" className="mt-4 block">
              <Button className="mx-auto max-w-xs">Find a parking spot</Button>
            </Link>
          </div>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Booking status"
              className="mt-6 flex gap-1 rounded-xl bg-[var(--pm-color-surface-raised)] p-1"
            >
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isActive
                        ? 'bg-[var(--pm-color-surface)] text-[var(--pm-color-text)] shadow-sm'
                        : 'text-[var(--pm-color-muted)] hover:text-[var(--pm-color-text)]'
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    {counts[tab.key] > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)]'
                        }`}
                      >
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {visibleBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)] p-10 text-center">
                <p className="text-sm text-[var(--pm-color-muted)]">
                  {activeTab === 'active'
                    ? 'No parking session is running right now.'
                    : activeTab === 'upcoming'
                      ? 'You have no upcoming reservations.'
                      : activeTab === 'reported'
                        ? 'You have not reported any issues.'
                        : 'No past bookings yet.'}
                </p>
                {activeTab !== 'past' && (
                  <Link to="/" className="mt-4 block">
                    <Button className="mx-auto max-w-xs">Find a parking spot</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {visibleBookings.map((booking) => (
                  <div key={booking.id}>
                    {LIVE_STATUSES.includes(booking.status) ? (
                      <ArrivalCard
                        booking={booking}
                        onBookingUpdated={handleBookingUpdated}
                        onExpired={handleExpired}
                      />
                    ) : (
                      <BookingSummary booking={booking} onRefresh={loadBookings} />
                    )}

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setOpenTimelineId((current) =>
                            current === booking.id ? null : booking.id,
                          )
                        }
                        fullWidth={false}
                      >
                        {openTimelineId === booking.id ? 'Hide history' : 'View history'}
                      </Button>

                      {REPORTABLE.includes(booking.status) && (
                        <Button
                          variant="secondary"
                          onClick={() => setReportingBooking(booking)}
                          fullWidth={false}
                        >
                          Report an issue
                        </Button>
                      )}

                      {booking.status === 'RESERVED' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleCancel(booking)}
                          loading={cancellingId === booking.id}
                          fullWidth={false}
                        >
                          Cancel booking
                        </Button>
                      )}
                    </div>

                    {openTimelineId === booking.id && (
                      <div className="mt-3 rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
                        <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
                          Booking history
                        </h3>
                        <BookingTimeline bookingId={booking.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {reportingBooking && (
        <ReportIssueForm
          booking={reportingBooking}
          onClose={() => setReportingBooking(null)}
          onReported={() => loadBookings()}
        />
      )}
    </AppLayout>
  );
}
