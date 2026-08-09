import { geofenceConfig } from '../../config/geofence';
import { haversineDistanceKm } from '../../utils/distance';

export type LocationSample = {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: Date;
  speedMps?: number;
};

export type LocationVerdict = {
  accepted: boolean;
  distanceMeters: number;
  rejectionReason?: string;
};

export type VerifyMode = 'CHECK_IN' | 'CHECK_OUT';

export function verifyLocationSample(
  sample: LocationSample,
  parkingLot: { latitude: number; longitude: number },
  mode: VerifyMode,
): LocationVerdict {
  if (geofenceConfig.demoMode) {
    return { accepted: true, distanceMeters: 0 };
  }

  const ageMs = Date.now() - sample.capturedAt.getTime();
  if (ageMs > geofenceConfig.locationMaxAgeSeconds * 1000) {
    return {
      accepted: false,
      distanceMeters: 0,
      rejectionReason: 'Location reading is stale.',
    };
  }

  if (sample.accuracy > geofenceConfig.maxAccuracyMeters) {
    return {
      accepted: false,
      distanceMeters: 0,
      rejectionReason: 'Location accuracy is too low.',
    };
  }

  if (
    sample.speedMps !== undefined &&
    sample.speedMps > geofenceConfig.maxSpeedMps
  ) {
    return {
      accepted: false,
      distanceMeters: 0,
      rejectionReason: 'Location data is invalid.',
    };
  }

  const distanceMeters = Math.round(
    haversineDistanceKm(
      sample.lat,
      sample.lng,
      parkingLot.latitude,
      parkingLot.longitude,
    ) * 1000,
  );

  if (mode === 'CHECK_IN') {
    if (distanceMeters > geofenceConfig.checkinRadiusMeters) {
      return {
        accepted: false,
        distanceMeters,
        rejectionReason: 'Location is too far from the parking lot.',
      };
    }
    return { accepted: true, distanceMeters };
  }

  if (distanceMeters <= geofenceConfig.checkoutRadiusMeters) {
    return {
      accepted: false,
      distanceMeters,
      rejectionReason: 'You are still inside the parking lot.',
    };
  }
  return { accepted: true, distanceMeters };
}
