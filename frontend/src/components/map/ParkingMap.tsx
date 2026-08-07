import type { ParkingLot } from '../../types';

interface ParkingMapProps {
  lots: ParkingLot[];
}

export default function ParkingMap({ lots }: ParkingMapProps) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <svg
        className="h-10 w-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <p className="text-sm font-semibold text-slate-700">Map coming soon</p>
      <p className="text-sm text-slate-500">
        Interactive Mapbox map arrives in a later phase. {lots.length} parking
        lots loaded.
      </p>
    </div>
  );
}
