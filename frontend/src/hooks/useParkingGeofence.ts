import { useCallback, useEffect, useMemo, useState } from 'react';
import { haversineDistanceMeters } from '../utils/distance';
import type { LatLng } from '../utils/geolocation';

export type GeofenceStatus =
  | 'idle'
  | 'active'
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export interface UseParkingGeofenceOptions {
  target: LatLng | null;
  radiusMeters?: number;
  enabled?: boolean;
  outsideReadingsRequired?: number;
}

export interface UseParkingGeofenceResult {
  status: GeofenceStatus;
  distanceMeters: number | null;
  isInside: boolean;
  outsideStreak: number;
  canCheckOut: boolean;
  simulated: boolean;
  error: string | null;
  simulate: (coords: LatLng) => void;
  clearSimulation: () => void;
}

const DEFAULT_RADIUS_METERS = 500;
const DEFAULT_OUTSIDE_READINGS_REQUIRED = 3;

const ERROR_MESSAGE_BY_CODE: Partial<Record<number, string>> = {
  1: 'Location permission was denied. Enable location access to use check-in and check-out.',
  2: "We couldn't determine your location right now.",
  3: 'Location request timed out. Please try again.',
};

const STATUS_BY_CODE: Partial<Record<number, WatchStatus>> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
};

type WatchStatus = 'inactive' | 'active' | 'denied' | 'unavailable' | 'timeout';

export function useParkingGeofence({
  target,
  radiusMeters = DEFAULT_RADIUS_METERS,
  enabled = false,
  outsideReadingsRequired = DEFAULT_OUTSIDE_READINGS_REQUIRED,
}: UseParkingGeofenceOptions): UseParkingGeofenceResult {
  const [watchStatus, setWatchStatus] = useState<WatchStatus>('inactive');
  const [watchError, setWatchError] = useState<string | null>(null);
  const [watchedPosition, setWatchedPosition] = useState<LatLng | null>(null);
  const [simulatedPosition, setSimulatedPosition] = useState<LatLng | null>(null);
  const [outsideStreak, setOutsideStreak] = useState(0);

  const supported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const active = Boolean(enabled && target);

  const recordPosition = useCallback(
    (position: LatLng) => {
      if (!target) {
        setOutsideStreak(0);
        return;
      }

      const distance = haversineDistanceMeters(
        target.lat,
        target.lng,
        position.lat,
        position.lng,
      );

      if (distance <= radiusMeters) {
        setOutsideStreak(0);
      } else {
        setOutsideStreak((current) => current + 1);
      }
    },
    [target, radiusMeters],
  );

  useEffect(() => {
    if (!active || simulatedPosition || !supported) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setWatchedPosition(coords);
        setWatchStatus('active');
        setWatchError(null);
        recordPosition(coords);
      },
      (positionError) => {
        setWatchError(
          ERROR_MESSAGE_BY_CODE[positionError.code] ?? 'Unable to get your location.',
        );
        setWatchStatus(STATUS_BY_CODE[positionError.code] ?? 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [active, simulatedPosition, supported, recordPosition]);

  let status: GeofenceStatus;
  if (!active) {
    status = 'idle';
  } else if (simulatedPosition) {
    status = 'active';
  } else if (!supported) {
    status = 'unsupported';
  } else if (watchStatus === 'inactive' || watchStatus === 'active') {
    status = 'active';
  } else {
    status = watchStatus;
  }

  const effectivePosition = active ? simulatedPosition ?? watchedPosition : null;

  const distanceMeters = useMemo(() => {
    if (!target || !effectivePosition) {
      return null;
    }
    return haversineDistanceMeters(
      target.lat,
      target.lng,
      effectivePosition.lat,
      effectivePosition.lng,
    );
  }, [target, effectivePosition]);

  const isInside = distanceMeters !== null && distanceMeters <= radiusMeters;

  const displayStreak = active ? outsideStreak : 0;

  const error =
    active && !supported && !simulatedPosition
      ? 'Location services are not supported by this browser.'
      : watchError;

  const simulate = useCallback(
    (coords: LatLng) => {
      setSimulatedPosition(coords);
      setWatchStatus('active');
      setWatchError(null);
      recordPosition(coords);
    },
    [recordPosition],
  );

  const clearSimulation = useCallback(() => {
    setSimulatedPosition(null);
  }, []);

  return {
    status,
    distanceMeters,
    isInside,
    outsideStreak: displayStreak,
    canCheckOut: active && displayStreak >= outsideReadingsRequired,
    simulated: simulatedPosition !== null,
    error,
    simulate,
    clearSimulation,
  };
}
