import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { ParkingLot } from '../../types/parking';
import { MARKER_COLORS, getMarkerAvailability } from '../../utils/markerAvailability';

interface ParkingMarkerProps {
  parking: ParkingLot;
  selected: boolean;
  onSelect: (parking: ParkingLot) => void;
}

export default function ParkingMarker({
  parking,
  selected,
  onSelect,
}: ParkingMarkerProps) {
  const { color, label } = getMarkerAvailability(parking);
  const markerColor = MARKER_COLORS[color];

  return (
    <AdvancedMarker
      position={{ lat: parking.latitude, lng: parking.longitude }}
      title={parking.name}
      onClick={() => onSelect(parking)}
      zIndex={selected ? 50 : 1}
    >
      <button
        type="button"
        aria-label={`${parking.name}, ${label}, ₹${parking.pricePerHour} per hour`}
        className={`group relative flex translate-y-[-10px] items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-black shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none ${
          selected
            ? 'scale-125 bg-slate-950 text-white ring-4 ring-emerald-400/60 shadow-emerald-900/60'
            : 'bg-white text-slate-950 shadow-slate-900/30'
        }`}
        style={{ borderColor: selected ? '#10b981' : markerColor }}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${selected ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: markerColor }}
          aria-hidden="true"
        />
        <span>₹{parking.pricePerHour}</span>
        <span
          className={`absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1 rotate-45 border-b-2 border-r-2 ${
            selected ? 'bg-slate-950' : 'bg-white'
          }`}
          style={{ borderColor: selected ? '#10b981' : markerColor }}
          aria-hidden="true"
        />
      </button>
    </AdvancedMarker>
  );
}
