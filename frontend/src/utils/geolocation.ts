export interface LatLng {
  lat: number;
  lng: number;
}

export type GeolocationFailureReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export type GeolocationResult =
  | { ok: true; coords: LatLng }
  | { ok: false; reason: GeolocationFailureReason };

const REASON_BY_ERROR_CODE: Partial<Record<number, GeolocationFailureReason>> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
};

export function getCurrentPositionDetailed(): Promise<GeolocationResult> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  return new Promise<GeolocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      (error) => {
        resolve({ ok: false, reason: REASON_BY_ERROR_CODE[error.code] ?? 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export async function getCurrentPosition(): Promise<LatLng | null> {
  const result = await getCurrentPositionDetailed();
  return result.ok ? result.coords : null;
}