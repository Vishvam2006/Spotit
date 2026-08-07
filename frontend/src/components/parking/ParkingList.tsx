import type { ParkingLot } from '../../types';
import ParkingCard from './ParkingCard';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface ParkingListProps {
  lots: ParkingLot[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  selectedId: string | null;
  distances: Record<string, number>;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function ParkingList({
  lots,
  isLoading,
  isError,
  errorMessage,
  selectedId,
  distances,
  onRetry,
  onSelect,
  onViewOnMap,
  onViewDetails,
}: ParkingListProps) {
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (lots.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      {lots.map((lot) => (
        <ParkingCard
          key={lot.id}
          lot={lot}
          selected={selectedId === lot.id}
          distanceKm={distances[lot.id]}
          onSelect={onSelect}
          onViewOnMap={onViewOnMap}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
