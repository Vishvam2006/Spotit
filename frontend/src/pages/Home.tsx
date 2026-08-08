import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import Logo from '../components/Logo';
import ParkingMap from '../components/map/ParkingMap';
import ParkingCard from '../components/map/ParkingCard';
import AddParkingForm from '../components/parking/AddParkingForm';
import SearchFilters from '../components/parking/SearchFilters';
import type { MapLocation } from '../components/map/ParkingMap';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { fetchParkingLots } from '../services/parking';
import { getCurrentPositionDetailed } from '../utils/geolocation';
import type { GeolocationFailureReason } from '../utils/geolocation';
import type { ParkingFilters, ParkingLot } from '../types/parking';

interface Notice {
  type: 'success' | 'error';
  message: string;
}

function locationErrorMessage(reason: GeolocationFailureReason): string {
  switch (reason) {
    case 'denied':
      return 'Location permission was denied. Nearest sort needs your location.';
    case 'unavailable':
      return "We couldn't determine your location. Nearest sort needs your location.";
    case 'timeout':
      return 'Location request timed out. Please try selecting Nearest again.';
    case 'unsupported':
      return 'Your browser does not support location services. Nearest sort is unavailable.';
  }
}

function hasMeaningfulFilters(filters: ParkingFilters): boolean {
  return (
    Boolean(filters.q?.trim()) ||
    Boolean(filters.city) ||
    filters.maxPrice !== undefined ||
    Boolean(filters.availableOnly) ||
    (filters.sort !== undefined && filters.sort !== 'newest') ||
    filters.lat !== undefined ||
    filters.lng !== undefined
  );
}

export default function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ParkingFilters>({});
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [isAddingParking, setIsAddingParking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nearestRequestId = useRef(0);

  const hasFilters = hasMeaningfulFilters(filters);

  const fetchLots = useCallback((nextFilters: ParkingFilters) => {
    let active = true;

    queueMicrotask(() => {
      if (active) setLoading(true);
    });

    fetchParkingLots(nextFilters)
      .then((lots) => {
        if (!active) return;
        setParkingLots(lots);
        setError(null);
        if (!hasMeaningfulFilters(nextFilters)) {
          setCities([...new Set(lots.map((lot) => lot.city))].sort());
        }
      })
      .catch(() => {
        if (active) setError('Failed to load parking lots. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => fetchLots(filters), [fetchLots, filters]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const handleFiltersChange = useCallback((patch: Partial<ParkingFilters>) => {
    if (patch.sort === 'nearest') {
      const requestId = ++nearestRequestId.current;
      getCurrentPositionDetailed().then((result) => {
        if (requestId !== nearestRequestId.current) return;
        if (result.ok) {
          setFilters((previous) => ({
            ...previous,
            sort: 'nearest',
            lat: result.coords.lat,
            lng: result.coords.lng,
          }));
        } else {
          setNotice({ type: 'error', message: locationErrorMessage(result.reason) });
          setFilters((previous) => ({ ...previous, sort: previous.sort ?? 'newest' }));
        }
      });
      return;
    }

    nearestRequestId.current += 1;
    setFilters((previous) => {
      const next = { ...previous, ...patch };
      if (next.sort !== 'nearest') {
        delete next.lat;
        delete next.lng;
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSelectedParkingId(null);
  }, []);

  const handleSelectId = useCallback((id: string | null) => {
    setSelectedParkingId(id);
    if (!id) return;

    requestAnimationFrame(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleSelectParking = useCallback(
    (parking: ParkingLot) => handleSelectId(parking.id),
    [handleSelectId],
  );

  const handleViewDetails = useCallback(
    (parking: ParkingLot) => navigate(`/parking/${parking.id}`),
    [navigate],
  );

  const startAddParking = useCallback(() => {
    setIsAddingParking(true);
    setSelectedLocation(null);
    setNotice(null);
  }, []);

  const cancelAddParking = useCallback(() => {
    setIsAddingParking(false);
    setSelectedLocation(null);
    setNotice(null);
  }, []);

  const handleLocationSelect = useCallback((location: MapLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleParkingCreated = useCallback(() => {
    setSelectedLocation(null);
    setIsAddingParking(false);
    setNotice({ type: 'success', message: 'Parking lot created successfully.' });
    fetchLots(filters);
  }, [fetchLots, filters]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              My Bookings
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {notice && (
          <div className="mb-5">
            <Alert variant={notice.type} message={notice.message} />
          </div>
        )}

        <div className="mb-5">
          <SearchFilters
            filters={filters}
            cities={cities}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : error ? (
          <Alert variant="error" message={error} />
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Parking Lots</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Click a parking lot to see it on the map.
                </p>
              </div>
              {isAddingParking ? (
                <button
                  onClick={cancelAddParking}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={startAddParking}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  + Add Parking
                </button>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="space-y-5">
                <div className="h-[560px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                  <ParkingMap
                    parkingLots={parkingLots}
                    selectedParkingId={selectedParkingId}
                    onSelect={handleSelectId}
                    onViewDetails={handleViewDetails}
                    isAddingParking={isAddingParking}
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                  />
                </div>

                {isAddingParking && (
                  <AddParkingForm
                    selectedLocation={selectedLocation}
                    onCreated={handleParkingCreated}
                    onCancel={cancelAddParking}
                  />
                )}
              </section>

              <aside>
                <h2 className="text-lg font-bold text-slate-900">All Parking Lots</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {parkingLots.length} available
                </p>

                {parkingLots.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      {hasFilters ? 'No parking lots found.' : 'No parking lots available right now.'}
                    </p>
                    {hasFilters && (
                      <p className="mt-1 text-sm text-slate-500">Try changing your filters.</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                    {parkingLots.map((parking) => (
                      <div
                        key={parking.id}
                        ref={(el) => {
                          cardRefs.current[parking.id] = el;
                        }}
                      >
                        <ParkingCard
                          parking={parking}
                          selected={parking.id === selectedParkingId}
                          onSelect={handleSelectParking}
                          onViewDetails={handleViewDetails}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
