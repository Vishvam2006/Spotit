import { InfoWindow } from '@vis.gl/react-google-maps';
import type { ParkingLot } from '../../types/parking';

interface ParkingPopupProps {
  parking: ParkingLot;
  onClose: () => void;
  onViewDetails: (parking: ParkingLot) => void;
}

export default function ParkingPopup({
  parking,
  onClose,
  onViewDetails,
}: ParkingPopupProps) {
  return (
    <InfoWindow
      position={{ lat: parking.latitude, lng: parking.longitude }}
      onCloseClick={onClose}
    >
      <div className="min-w-56">
        <h3 className="text-sm font-semibold text-slate-900">{parking.name}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{parking.address}</p>
        <dl className="mt-2 space-y-1 text-xs text-slate-700">
          <div className="flex justify-between gap-6">
            <dt>Price</dt>
            <dd className="font-semibold">₹{parking.pricePerHour}/hr</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Available</dt>
            <dd className="font-semibold">{parking.availableSpaces}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Total</dt>
            <dd className="font-semibold">{parking.totalSpaces}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => onViewDetails(parking)}
          className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          View Details
        </button>
      </div>
    </InfoWindow>
  );
}