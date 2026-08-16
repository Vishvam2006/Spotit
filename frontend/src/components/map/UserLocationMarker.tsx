import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { LatLng } from '../../utils/geolocation';

interface UserLocationMarkerProps {
  position: LatLng;
}

export default function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <AdvancedMarker position={position} title="Your location" zIndex={20}>
      <div className="relative flex h-20 w-20 items-center justify-center" aria-label="Your location">
        <span className="absolute h-16 w-16 animate-ping rounded-full bg-sky-500/20" />
        <span className="absolute h-14 w-14 rounded-full border border-sky-400/70 bg-sky-400/15" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-[4px] border-white bg-sky-600 shadow-xl shadow-sky-950/35 ring-4 ring-sky-500/30">
          <span className="h-3 w-3 rounded-full bg-white" />
        </span>
        <span className="absolute top-full mt-1 whitespace-nowrap rounded-full bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
          You are here
        </span>
      </div>
    </AdvancedMarker>
  );
}
