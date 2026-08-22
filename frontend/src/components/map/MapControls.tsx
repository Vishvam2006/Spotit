import { useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LocateFixed, Map as MapIcon, RotateCcw, Satellite } from 'lucide-react';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/map';
import { getCurrentPosition } from '../../utils/geolocation';
import type { LatLng } from '../../utils/geolocation';

export type MapViewType = 'roadmap' | 'satellite';

interface MapControlsProps {
  userLocation?: LatLng | null;
  mapView: MapViewType;
  onMapViewChange: (view: MapViewType) => void;
}

export default function MapControls({
  userLocation = null,
  mapView,
  onMapViewChange,
}: MapControlsProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocateMe = async () => {
    if (!map) return;
    setLocating(true);
    try {
      const location = userLocation ?? (await getCurrentPosition());
      if (location) {
        map.panTo(location);
        map.setZoom(15);
      } else {
        map.panTo(DEFAULT_MAP_CENTER);
        map.setZoom(DEFAULT_MAP_ZOOM);
      }
    } finally {
      setLocating(false);
    }
  };

  const handleReset = () => {
    if (!map) return;
    map.panTo(DEFAULT_MAP_CENTER);
    map.setZoom(DEFAULT_MAP_ZOOM);
  };

  const toggleMapView = () => {
    onMapViewChange(mapView === 'roadmap' ? 'satellite' : 'roadmap');
  };

  const buttonClasses =
    'pm-touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2a2a34] bg-[#141418]/95 text-white shadow-xl shadow-black/60 backdrop-blur-xl transition-all hover:bg-[#202028] hover:scale-105 active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="absolute right-4 top-32 z-10 flex flex-col gap-2.5 sm:top-24">
      {/* Map Layers Toggle (Satellite / Roadmap) */}
      <button
        type="button"
        onClick={toggleMapView}
        disabled={!map}
        className={buttonClasses}
        aria-pressed={mapView === 'satellite'}
        aria-label={mapView === 'satellite' ? 'Switch to map view' : 'Switch to satellite view'}
        title={mapView === 'satellite' ? 'Map view' : 'Satellite'}
      >
        {mapView === 'satellite' ? (
          <MapIcon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        ) : (
          <Satellite className="h-5 w-5 text-slate-300" aria-hidden="true" />
        )}
      </button>

      {/* Recenter / Reset */}
      <button
        type="button"
        onClick={handleReset}
        disabled={!map}
        className={buttonClasses}
        aria-label="Reset map"
        title="Reset map view"
      >
        <RotateCcw className="h-5 w-5 text-slate-300" aria-hidden="true" />
      </button>

      {/* GPS Locate Me Button (Google Maps Style) */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={!map || locating}
        className={buttonClasses}
        aria-label={locating ? 'Locating' : 'Locate me'}
        title="Your location"
      >
        <LocateFixed className={`h-5 w-5 ${locating ? 'animate-pulse text-emerald-400' : 'text-slate-200'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
