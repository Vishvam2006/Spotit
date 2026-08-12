import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { LatLng } from '../../utils/geolocation';

interface UserLocationMarkerProps {
  position: LatLng;
}

export default function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <AdvancedMarker position={position} title="Your location" zIndex={20}>
      <div className="relative flex h-12 w-12 items-center justify-center" aria-label="Your location">
        <span className="absolute h-12 w-12 rounded-full bg-sky-500/15" />
        <span className="absolute h-9 w-9 animate-ping rounded-full bg-sky-400/35" />
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-white bg-sky-500 shadow-lg shadow-sky-900/30 ring-4 ring-sky-500/20">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </div>
    </AdvancedMarker>
  );
}
