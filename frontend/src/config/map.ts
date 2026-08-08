export const GOOGLE_MAPS_API_KEY = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const GOOGLE_MAPS_MAP_ID = import.meta.env
  .VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

export const GOOGLE_MAPS_LIBRARIES: ('marker' | 'places')[] = ['marker'];

export const DEFAULT_MAP_CENTER = {
  lat: 23.0225,
  lng: 72.5714,
};

export const DEFAULT_MAP_ZOOM = 12;
