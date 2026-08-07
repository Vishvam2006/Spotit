import { GeolocateControl, NavigationControl } from 'react-map-gl/mapbox';
import { RotateCcw } from 'lucide-react';

interface MapControlsProps {
  onReset: () => void;
}

export default function MapControls({ onReset }: MapControlsProps) {
  return (
    <>
      <NavigationControl position="top-right" showCompass={false} />
      <GeolocateControl
        position="top-right"
        positionOptions={{ enableHighAccuracy: true }}
        trackUserLocation
      />
      <div className="absolute right-3 top-40">
        <button
          type="button"
          onClick={onReset}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_12px_28px_rgb(15_23_42_/_0.12)] transition-all duration-200 hover:bg-[#F8FAFC] focus:outline-none focus:ring-4 focus:ring-teal-100"
          title="Reset map view"
          aria-label="Reset map view"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
