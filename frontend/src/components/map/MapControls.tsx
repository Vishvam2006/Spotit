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
    'pm-touch-target inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md shadow-slate-900/10 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="absolute left-4 top-40 z-10 flex flex-row gap-2 sm:left-auto sm:right-4 sm:top-4 sm:flex-col">
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
          <MapIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Satellite className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={handleReset}
        disabled={!map}
        className={buttonClasses}
        aria-label="Reset map"
        title="Reset map"
      >
        <RotateCcw className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={!map || locating}
        className={buttonClasses}
        aria-label={locating ? 'Locating' : 'Locate me'}
        title="Locate me"
      >
        <LocateFixed className={`h-5 w-5 ${locating ? 'animate-pulse' : ''}`} aria-hidden="true" />
      </button>
    </div>
  );
}
