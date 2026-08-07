import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
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
  const { color } = getMarkerAvailability(parking);

  return (
    <AdvancedMarker
      position={{ lat: parking.latitude, lng: parking.longitude }}
      title={parking.name}
      onClick={() => onSelect(parking)}
      zIndex={selected ? 1 : undefined}
    >
      <Pin
        background={MARKER_COLORS[color]}
        borderColor={selected ? '#1d4ed8' : '#ffffff'}
        glyphColor="#ffffff"
      />
    </AdvancedMarker>
  );
}