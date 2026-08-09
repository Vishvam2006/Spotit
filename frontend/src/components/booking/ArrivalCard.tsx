import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Booking } from '../../types/booking';
import { checkInBooking, checkOutBooking } from '../../services/bookings';
import { getErrorMessage } from '../../services/api';
import { formatDateTime, formatINR } from '../../utils/format';
import { formatDistanceMeters } from '../../utils/distance';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import { useParkingGeofence } from '../../hooks/useParkingGeofence';
import type { LatLng } from '../../utils/geolocation';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

interface ArrivalCardProps {
  booking: Booking;
  onBookingUpdated: (booking: Booking) => void;
  onExpired: () => void;
}

const SIMULATION_CAPTION = 'Simulated for the web MVP.';

function farAwayCoords(origin: LatLng): LatLng {
  return {
    lat: origin.lat + 0.015,
    lng: origin.lng + 0.015,
  };
}

function useCountdown(
  targetTime: number,
  enabled: boolean,
  onDone: () => void,
): number {
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    doneRef.current = false;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetTime, enabled]);

  const remaining = Math.max(0, targetTime - now);

  useEffect(() => {
    if (enabled && remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [enabled, remaining, onDone]);

  return remaining;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export default function ArrivalCard({
  booking,
  onBookingUpdated,
  onExpired,
}: ArrivalCardProps) {
  const target = useMemo(
    () => ({
      lat: booking.parkingLot.latitude,
      lng: booking.parkingLot.longitude,
    }),
    [booking.parkingLot.latitude, booking.parkingLot.longitude],
  );

  const {
    distanceMeters,
    isInside,
    outsideStreak,
    canCheckOut: geofenceCanCheckOut,
    simulated,
    simulationEnabled,
    error: geofenceError,
    simulate,
  } = useParkingGeofence({ target, enabled: true });

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const reservedUntilMs = new Date(booking.reservedUntil).getTime();
  const countdownMs = useCountdown(
    reservedUntilMs,
    booking.status === 'RESERVED',
    onExpired,
  );

  const runAction = useCallback(
    async (action: () => Promise<Booking>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setActionError(null);
      try {
        const updated = await action();
        onBookingUpdated(updated);
      } catch (err) {
        setActionError(getErrorMessage(err));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [onBookingUpdated],
  );

  const handleCheckIn = () => runAction(() => checkInBooking(booking.id));
  const handleCheckOut = () => runAction(() => checkOutBooking(booking.id));

  const proximityMet =
    booking.status === 'RESERVED' ? isInside || simulated : geofenceCanCheckOut || simulated;

  const amount =
    booking.status === 'ACTIVE'
      ? booking.finalAmount ?? booking.estimatedAmount
      : booking.estimatedAmount;

  const distanceLabel =
    distanceMeters !== null ? formatDistanceMeters(distanceMeters) : null;

  const proximityMessage =
    booking.status === 'RESERVED'
      ? isInside || simulated
        ? 'You are at the parking lot — ready to check in.'
        : 'Move within the geofence (or simulate arrival) to check in.'
      : geofenceCanCheckOut || simulated
        ? 'Confirmed outside the lot — ready to check out.'
        : 'Wait for outside-location readings (or simulate leaving) to check out.';

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
      {simulationEnabled && (
        <div className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold tracking-wide text-amber-800 ring-1 ring-amber-300">
          DEMO MODE — simulation controls enabled
        </div>
      )}
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

      {booking.status === 'RESERVED' && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-emerald-200">
          <p className="text-xs font-medium text-emerald-700/70">Reserved for</p>
          <p
            className={`mt-0.5 font-mono text-3xl font-bold tabular-nums ${
              countdownMs === 0 ? 'text-orange-600' : 'text-emerald-900'
            }`}
          >
            {formatCountdown(countdownMs)}
          </p>
          <p className="mt-1 text-xs text-emerald-700/70">
            until {formatDateTime(booking.reservedUntil)}
          </p>
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-emerald-700/70">Vehicle</dt>
          <dd className="font-semibold text-emerald-900">{booking.vehicleNumber}</dd>
        </div>
        <div>
          <dt className="text-emerald-700/70">
            {booking.status === 'ACTIVE' ? 'Amount' : 'Estimated'}
          </dt>
          <dd className="font-semibold text-emerald-900">{formatINR(amount)}</dd>
        </div>
        <div>
          <dt className="text-emerald-700/70">
            {booking.status === 'ACTIVE' ? 'Checked in' : 'Status'}
          </dt>
          <dd className="font-semibold text-emerald-900">
            {booking.status === 'ACTIVE' && booking.checkInTime
              ? formatDateTime(booking.checkInTime)
              : 'Awaiting check-in'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-emerald-200">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isInside
              ? 'bg-emerald-100 text-emerald-700'
              : distanceMeters !== null
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          {distanceLabel ? (isInside ? 'Inside' : 'Outside') : 'Locating…'}
        </span>
        {distanceLabel && <span className="text-xs text-slate-600">{distanceLabel} away</span>}
        {simulated && (
          <span className="text-xs font-medium text-slate-500">{SIMULATION_CAPTION}</span>
        )}
      </div>

      <p className="mt-3 text-sm text-emerald-800">{proximityMessage}</p>

      {booking.status === 'ACTIVE' && (
        <div className="mt-2 text-xs text-emerald-700/70">
          Outside-location readings: {outsideStreak}
        </div>
      )}

      {(geofenceError || actionError) && (
        <div className="mt-4">
          <Alert variant="error" message={actionError ?? geofenceError ?? ''} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {booking.status === 'RESERVED' ? (
          <Button onClick={handleCheckIn} loading={busy} disabled={!proximityMet}>
            Check in
          </Button>
        ) : (
          <Button onClick={handleCheckOut} loading={busy} disabled={!proximityMet}>
            Check out & pay
          </Button>
        )}
      </div>

      {simulationEnabled && (
        <div className="mt-4 border-t border-emerald-200 pt-4">
          <p className="text-xs font-medium text-emerald-700/70">Test mode</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="w-auto"
              disabled={busy}
              onClick={() => simulate(target)}
            >
              Simulate arrival
            </Button>
            <Button
              variant="secondary"
              className="w-auto"
              disabled={busy}
              onClick={() => simulate(farAwayCoords(target))}
            >
              Simulate leaving
            </Button>
          </div>
          <p className="mt-2 text-xs text-emerald-700/70">
            {SIMULATION_CAPTION} Use these buttons to test the check-in and check-out flow in a
            browser.
          </p>
        </div>
      )}
    </div>
  );
}
