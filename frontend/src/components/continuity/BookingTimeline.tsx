import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { fetchBookingTimeline } from '../../services/continuity';
import { getEventLabel } from '../../utils/continuity';
import { formatDateTime } from '../../utils/format';
import type { ContinuityEvent } from '../../types/continuity';

interface BookingTimelineProps {
  bookingId: string;
}

/**
 * The booking's status history, straight from the continuity ledger. This is
 * what makes "your case did not disappear" checkable rather than a promise.
 */
export default function BookingTimeline({ bookingId }: BookingTimelineProps) {
  const [events, setEvents] = useState<ContinuityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetchBookingTimeline(bookingId)
      .then((result) => {
        if (active) setEvents(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5 text-emerald-600" />
      </div>
    );
  }

  if (failed || events.length === 0) {
    return (
      <p className="py-4 text-sm text-[var(--pm-color-muted)]">
        No history recorded for this booking yet.
      </p>
    );
  }

  return (
    <ol className="mt-1 space-y-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[11px] top-6 h-full w-px bg-[var(--pm-color-border)]"
              />
            )}
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] ring-1 ring-[var(--pm-color-border)]">
              <History className="h-3 w-3" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--pm-color-text)]">
                {getEventLabel(event.type)}
              </p>
              {event.reason && (
                <p className="text-xs text-[var(--pm-color-muted)]">{event.reason}</p>
              )}
              <p className="mt-0.5 text-xs text-[var(--pm-color-muted)]">
                {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
