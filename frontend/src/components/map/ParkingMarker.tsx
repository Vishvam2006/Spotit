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
      zIndex={selected ? 10 : 1}
    >
      <button
        type="button"
        aria-label={`${parking.name}, ${label}, ₹${parking.pricePerHour} per hour`}
        className={`group relative flex translate-y-[-8px] items-center gap-1.5 rounded-full border-2 bg-white px-3 py-1.5 text-xs font-black text-slate-950 shadow-lg shadow-slate-900/20 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          selected ? 'scale-110 ring-4 ring-emerald-400/25' : ''
        }`}
        style={{ borderColor: selected ? '#111827' : markerColor }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: markerColor }}
          aria-hidden="true"
        />
        <span>₹{parking.pricePerHour}</span>
        <span
          className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1 rotate-45 border-b-2 border-r-2 bg-white"
          style={{ borderColor: selected ? '#111827' : markerColor }}
          aria-hidden="true"
        />
      </button>
    </AdvancedMarker>
  );
}
