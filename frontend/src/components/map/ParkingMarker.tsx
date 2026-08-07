import { Marker } from 'react-map-gl/mapbox';
import type { ParkingLot } from '../../types';
import { getMarkerTone, MARKER_COLORS } from './parkingMarkerColor';

interface ParkingMarkerProps {
  lot: ParkingLot;
  selected: boolean;
  onSelect: (lot: ParkingLot) => void;
}

export default function ParkingMarker({
  lot,
  selected,
  onSelect,
}: ParkingMarkerProps) {
  const color = MARKER_COLORS[getMarkerTone(lot)];

  return (
    <Marker
      longitude={lot.longitude}
      latitude={lot.latitude}
      anchor="bottom"
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onSelect(lot);
      }}
    >
      <button
        type="button"
        className="group relative cursor-pointer focus:outline-none"
        title={lot.name}
        aria-label={`Select ${lot.name}`}
      >
        {selected && (
          <span
            className="absolute -inset-3 animate-ping rounded-full opacity-20"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full shadow-[0_10px_24px_rgb(15_23_42_/_0.18)] ring-4 ring-white transition-transform duration-200 group-hover:scale-110 ${
            selected ? 'scale-110' : ''
          }`}
          style={{ backgroundColor: color }}
        >
          <span className="h-3 w-3 rounded-full bg-white" />
        </span>
      </button>
    </Marker>
  );
}
