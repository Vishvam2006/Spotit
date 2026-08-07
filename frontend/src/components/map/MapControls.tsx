import { useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/map';
import { getCurrentPosition } from '../../utils/geolocation';

export default function MapControls() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocateMe = async () => {
    if (!map) return;
    setLocating(true);
    try {
      const location = await getCurrentPosition();
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

  const buttonClasses =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleReset}
        disabled={!map}
        className={buttonClasses}
      >
        Reset Map
      </button>
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={!map || locating}
        className={buttonClasses}
      >
        {locating ? 'Locating…' : 'Locate Me'}
      </button>
    </div>
  );
}