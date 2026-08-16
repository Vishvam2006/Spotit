export const GOOGLE_MAPS_API_KEY = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const GOOGLE_MAPS_MAP_ID = import.meta.env
  .VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

export const GOOGLE_MAPS_LIBRARIES: ('marker' | 'places')[] = ['marker'];

export const DEFAULT_MAP_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
};

export const DEFAULT_MAP_ZOOM = 12;
