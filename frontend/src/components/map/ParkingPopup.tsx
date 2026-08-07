import { ArrowRight } from 'lucide-react';
import { Popup } from 'react-map-gl/mapbox';
import type { ParkingLot } from '../../types';

interface ParkingPopupProps {
  lot: ParkingLot;
  onClose: () => void;
  onViewDetails: (id: string) => void;
}

export default function ParkingPopup({
  lot,
  onClose,
  onViewDetails,
}: ParkingPopupProps) {
  return (
    <Popup
      longitude={lot.longitude}
      latitude={lot.latitude}
      closeButton
      onClose={onClose}
      offset={30}
      maxWidth="280px"
    >
      <div className="min-w-60">
        <h3 className="pr-6 text-sm font-bold text-[#0F172A]">{lot.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-[#64748B]">
          {lot.city} · {lot.address}
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#64748B]">Price</p>
            <p className="text-xl font-bold text-[#0F172A]">
              ₹{lot.pricePerHour}
              <span className="text-sm text-[#64748B]">/hr</span>
            </p>
          </div>
          <p
            className={
              lot.availableSpaces === 0
                ? 'text-sm font-bold text-[#EF4444]'
                : 'text-sm font-bold text-[#22C55E]'
            }
          >
            {lot.availableSpaces}/{lot.totalSpaces} spaces
          </p>
        </div>
        <button
          onClick={() => onViewDetails(lot.id)}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#19C7B2] px-4 py-2.5 text-sm font-bold text-[#0B1220] transition-all duration-200 hover:bg-[#0E9F94] hover:text-white"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Popup>
  );
}
