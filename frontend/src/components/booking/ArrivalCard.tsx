import { useCallback, useMemo, useRef, useState } from 'react';
import type { Booking } from '../../types/booking';
import {
  checkInBooking,
  checkOutBooking,
  type LocationSamplePayload,
} from '../../services/bookings';
import { getErrorMessage, isNetworkError } from '../../services/api';
import { formatDateTime, formatINR } from '../../utils/format';
import { formatDistanceMeters } from '../../utils/distance';
import { notifyError, notifySuccess } from '../../utils/notify';
import { getBookingStatusStyles } from '../../utils/bookingStatus';
import { useParkingGeofence } from '../../hooks/useParkingGeofence';
import { useBookingHeartbeat } from '../../hooks/useBookingHeartbeat';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown';
import type { LatLng } from '../../utils/geolocation';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import VehicleDetails from '../vehicle/VehicleDetails';

interface ArrivalCardProps {
  booking: Booking;
  onBookingUpdated: (booking: Booking) => void;
  onExpired: () => void;
}

const SIMULATION_CAPTION = 'Simulated for the web MVP.';

const FALLBACK_OFFLINE_MESSAGE =
  "You're offline. Your booking is safe — check in again once you reconnect.";

function farAwayCoords(origin: LatLng): LatLng {
  return {
    lat: origin.lat + 0.015,
    lng: origin.lng + 0.015,
  };
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
    position,
    distanceMeters,
    isInside,
    outsideStreak,
    canCheckOut: geofenceCanCheckOut,
    simulated,
    simulationEnabled,
    accuracyMeters,
    sampleTimestamp,
    error: geofenceError,
    simulate,
  } = useParkingGeofence({ target, enabled: true });

  const sample = useMemo<LocationSamplePayload | null>(() => {
    if (!position || accuracyMeters === null || sampleTimestamp === null) {
      return null;
    }
    return {
      lat: position.lat,
      lng: position.lng,
      accuracy: accuracyMeters,
      capturedAt: new Date(sampleTimestamp).toISOString(),
    };
  }, [position, accuracyMeters, sampleTimestamp]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const checkInDeadlineMs = new Date(booking.checkInDeadline).getTime();
  const checkInCountdownMs = useCountdown(
    checkInDeadlineMs,
    booking.status === 'RESERVED',
    onExpired,
  );

  const sessionEndMs = booking.sessionEndsAt
    ? new Date(booking.sessionEndsAt).getTime()
    : 0;
  const sessionCountdownMs = useCountdown(sessionEndMs, booking.status === 'ACTIVE', () => {});

  const runAction = useCallback(
    async (action: () => Promise<Booking>, successMessage: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setActionError(null);
      try {
        const updated = await action();
        onBookingUpdated(updated);
        notifySuccess(successMessage);
      } catch (err) {
        const message = isNetworkError(err)
          ? FALLBACK_OFFLINE_MESSAGE
          : getErrorMessage(err);
        setActionError(message);
        notifyError(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [onBookingUpdated],
  );

  const handleCheckIn = () =>
    runAction(
      () => checkInBooking(booking.id, sample ?? undefined),
      'Checked in! Your parking session has started.',
    );
  const handleCheckOut = () =>
    runAction(
      () => checkOutBooking(booking.id, sample ?? undefined),
      'Checked out! Your booking is complete.',
    );

  useBookingHeartbeat(booking, sample, onBookingUpdated);

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
        : 'Move within the geofence to check in.'
      : geofenceCanCheckOut || simulated
        ? 'Confirmed outside the lot — ready to check out.'
        : 'Wait for outside-location readings (or simulate leaving) to check out.';
  const parkingImageUrl = booking.parkingLot.photos?.[0] ?? booking.parkingLot.imageUrl;

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-300 bg-emerald-50 shadow-sm">
      {parkingImageUrl && (
        <div className="aspect-video bg-emerald-100">
          <img
            src={parkingImageUrl}
            alt={booking.parkingLot.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
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
          <p className="text-xs font-medium text-emerald-700/70">
            Check in within the next
          </p>
          <p
            className={`mt-0.5 font-mono text-3xl font-bold tabular-nums ${
              checkInCountdownMs === 0 ? 'text-orange-600' : 'text-emerald-900'
            }`}
          >
            {formatCountdown(checkInCountdownMs)}
          </p>
          <p className="mt-1 text-xs text-emerald-700/70">
            Deadline {formatDateTime(booking.checkInDeadline)} — your slot is held
            until you arrive.
          </p>
        </div>
      )}

      {booking.status === 'ACTIVE' && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-emerald-200">
          <p className="text-xs font-medium text-emerald-700/70">
            Session ends in
          </p>
          <p
            className={`mt-0.5 font-mono text-3xl font-bold tabular-nums ${
              sessionCountdownMs === 0 ? 'text-orange-600' : 'text-emerald-900'
            }`}
          >
            {formatCountdown(sessionCountdownMs)}
          </p>
          <p className="mt-1 text-xs text-emerald-700/70">
            Planned end {booking.sessionEndsAt ? formatDateTime(booking.sessionEndsAt) : '—'}
            · started at check-in
          </p>
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-emerald-700/70">Vehicle</dt>
          <dd className="mt-1.5">
            <VehicleDetails vehicle={booking.vehicle} />
          </dd>
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
    </div>
  );
}
