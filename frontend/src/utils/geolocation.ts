export interface LatLng {
  lat: number;
  lng: number;
}

export async function getCurrentPosition(): Promise<LatLng | null> {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return new Promise<LatLng | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}