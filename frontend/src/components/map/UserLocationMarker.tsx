import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { LatLng } from '../../utils/geolocation';

interface UserLocationMarkerProps {
  position: LatLng;
}

export default function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <AdvancedMarker position={position} title="Your location" zIndex={3}>
      <div className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-8 w-8 animate-ping rounded-full bg-blue-400/40" />
        <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md ring-2 ring-blue-200" />
      </div>
    </AdvancedMarker>
  );
}
