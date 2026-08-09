import { useEffect, useRef } from 'react';
import { heartbeatBooking, type LocationSamplePayload } from '../services/bookings';
import type { Booking } from '../types/booking';

export const HEARTBEAT_INTERVAL_MS = 30_000;

export function useBookingHeartbeat(
  booking: Booking,
  sample: LocationSamplePayload | null,
  onBookingUpdated: (booking: Booking) => void,
): void {
  const sampleRef = useRef(sample);
  const onUpdatedRef = useRef(onBookingUpdated);

  useEffect(() => {
    sampleRef.current = sample;
    onUpdatedRef.current = onBookingUpdated;
  });

  useEffect(() => {
    if (booking.status !== 'ACTIVE') {
      return;
    }

    let cancelled = false;

    const send = async () => {
      try {
        const updated = await heartbeatBooking(
          booking.id,
          sampleRef.current ?? undefined,
        );
        if (!cancelled) {
          onUpdatedRef.current(updated);
        }
      } catch {
        // Transient failures are fine; the next interval retries.
      }
    };

    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking.id, booking.status]);
}
