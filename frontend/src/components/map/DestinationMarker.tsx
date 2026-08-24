import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import type { LatLng } from '../../utils/geolocation';

interface DestinationMarkerProps {
  position: LatLng;
  title?: string;
  onClear?: () => void;
}

export default function DestinationMarker({ position, title }: DestinationMarkerProps) {
  return (
    <AdvancedMarker position={position} title={title || 'Destination'} zIndex={25}>
      <div className="relative flex flex-col items-center justify-center -translate-y-6">
        {/* Pulsing Outer Rings */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute h-14 w-14 animate-ping rounded-full bg-rose-500/25" />
          <span className="absolute h-10 w-10 rounded-full bg-rose-500/20 ring-2 ring-rose-400/40" />

          {/* Main Pin */}
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-xl shadow-rose-950/40">
            <MapPin className="h-5 w-5 fill-white text-rose-600" aria-hidden="true" />
          </span>
        </div>

        {/* Floating Label Badge */}
        {title && (
          <div className="mt-0.5 flex max-w-[200px] items-center gap-1 rounded-full border border-rose-500/30 bg-slate-950/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            <span className="truncate">{title}</span>
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
