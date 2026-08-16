import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { Booking } from '../../types/booking';
import type { ParkingLot } from '../../types/parking';
import { fetchParkingLots } from '../../services/parking';
import ParkingCard from '../map/ParkingCard';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';

const MAX_SUGGESTIONS = 3;

const suggestionCache = new Map<string, ParkingLot[]>();

interface SmartSuggestProps {
  booking: Booking;
}

/**
 * Recommends nearby, available parking alternatives for a booking that was
 * cancelled because the parking owner deactivated the location. Suggestions
 * are anchored to the deactivated parking's coordinates (not the user's
 * current location) and reuse the existing nearest/available parking search.
 */
export default function SmartSuggest({ booking }: SmartSuggestProps) {
  const navigate = useNavigate();

  const showSmartSuggest =
    booking.status === 'CANCELLED' && booking.cancellationReason === 'PARKING_DEACTIVATED';

  const origin = {
    lat: booking.parkingLot.latitude,
    lng: booking.parkingLot.longitude,
  };

  const [suggestions, setSuggestions] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    const cached = suggestionCache.get(booking.id);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    fetchParkingLots({
      sort: 'nearest',
      lat: origin.lat,
      lng: origin.lng,
      availableOnly: true,
    })
      .then((lots) => {
        const relevant = lots
          .filter(
            (lot) =>
              lot.id !== booking.parkingLotId &&
              lot.status === 'ACTIVE' &&
              lot.availableSpaces > 0,
          )
          .slice(0, MAX_SUGGESTIONS);

        if (active) {
          suggestionCache.set(booking.id, relevant);
          setSuggestions(relevant);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking.id, booking.parkingLotId, origin.lat, origin.lng]);

  useEffect(() => {
    if (!showSmartSuggest) return;
    return load();
  }, [showSmartSuggest, reloadKey, load]);

  if (!showSmartSuggest) {
    return null;
  }

  const handleRetry = () => {
    suggestionCache.delete(booking.id);
    setReloadKey((value) => value + 1);
  };

  const viewMore = () => {
    navigate(`/?lat=${origin.lat}&lng=${origin.lng}`);
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h4 className="text-base font-bold text-slate-900">Smart Suggest</h4>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        We found nearby parking alternatives around your cancelled parking.
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <Spinner className="h-4 w-4 text-emerald-600" />
            Finding nearby parking for you...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Unable to load nearby parking suggestions.</p>
            <Button variant="secondary" size="sm" className="mt-3 max-w-40" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No nearby parking is currently available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try expanding your search area to find more options.
            </p>
            <Button className="mx-auto mt-4 max-w-xs" onClick={() => navigate('/')}>
              Find Parking
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {suggestions.map((parking) => (
                <ParkingCard
                  key={parking.id}
                  parking={parking}
                  selected={false}
                  onSelect={(lot) => navigate(`/parking/${lot.id}`)}
                  onViewDetails={(lot) => navigate(`/parking/${lot.id}`)}
                />
              ))}
            </div>
            <Button variant="secondary" className="mt-4" onClick={viewMore}>
              View More Nearby Parking
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
