import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import Logo from '../components/Logo';
import ParkingMap from '../components/map/ParkingMap';
import type { MapLocation } from '../components/map/ParkingMap';
import SearchBar from '../components/map/SearchBar';
import DistanceFilter from '../components/map/DistanceFilter';
import AddParkingForm from '../components/parking/AddParkingForm';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { fetchParkingLots } from '../services/parking';
import { DEFAULT_MAP_CENTER } from '../config/map';
import { geocodePlaceQuery } from '../utils/geocoding';
import { getCurrentPositionDetailed } from '../utils/geolocation';
import type { LatLng } from '../utils/geolocation';
import { isWithinRadiusKm } from '../utils/distance';
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify';
import type { ParkingLot } from '../types/parking';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const DEFAULT_RADIUS_KM = 25;
const SEARCH_DEBOUNCE_MS = 500;

function filterLotsByRadius(
  lots: ParkingLot[],
  center: LatLng,
  radiusKm: number,
): ParkingLot[] {
  if (radiusKm <= 0) return [];
  return lots.filter((lot) =>
    isWithinRadiusKm(center.lat, center.lng, lot.latitude, lot.longitude, radiusKm),
  );
}

export default function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const [searchLocation, setSearchLocation] = useState<LatLng | null>(null);
  const [searching, setSearching] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [isAddingParking, setIsAddingParking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  const reloadParkingLots = useCallback(() => {
    fetchParkingLots()
      .then((lots) => {
        setAllParkingLots(lots);
        setError(null);
      })
      .catch(() => {
        setError('Failed to load parking lots. Please try again.');
      });
  }, []);

  useEffect(() => {
    let active = true;

    fetchParkingLots()
      .then((lots) => {
        if (active) {
          setAllParkingLots(lots);
          setError(null);
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

  useEffect(() => {
    let active = true;

    getCurrentPositionDetailed().then((result) => {
      if (!active) return;

      if (result.ok) {
        setUserLocation(result.coords);
      } else if (result.reason === 'denied') {
        notifyInfo('Location permission denied. Showing the default map area.');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = submittedSearch.trim() || debouncedSearch.trim();
    if (!trimmed) return;

    let active = true;

    queueMicrotask(() => {
      if (active) setSearching(true);
    });

    geocodePlaceQuery(trimmed)
      .then((location) => {
        if (!active) return;
        if (location) {
          setSearchLocation(location);
        } else {
          notifyError('Could not find that location. Try another search.');
          setSearchLocation(null);
        }
      })
      .catch(() => {
        if (active) {
          notifyError('Search failed. Please try again.');
          setSearchLocation(null);
        }
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, submittedSearch]);

  const mapCenter = useMemo(
    () => searchLocation ?? userLocation ?? DEFAULT_MAP_CENTER,
    [searchLocation, userLocation],
  );

  const filteredParkingLots = useMemo(
    () => filterLotsByRadius(allParkingLots, mapCenter, radiusKm),
    [allParkingLots, mapCenter, radiusKm],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedParkingId(null);
    if (!value.trim()) {
      setSubmittedSearch('');
      setSearchLocation(null);
      setSearching(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSubmittedSearch(searchQuery.trim());
    setSelectedParkingId(null);
  }, [searchQuery]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setSubmittedSearch('');
    setSearchLocation(null);
    setSelectedParkingId(null);
    setSearching(false);
  }, []);

  const handleViewDetails = useCallback(
    (parking: ParkingLot) => navigate(`/parking/${parking.id}`),
    [navigate],
  );

  const startAddParking = useCallback(() => {
    setIsAddingParking(true);
    setSelectedLocation(null);
  }, []);

  const cancelAddParking = useCallback(() => {
    setIsAddingParking(false);
    setSelectedLocation(null);
  }, []);

  const handleLocationSelect = useCallback((location: MapLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleParkingCreated = useCallback(() => {
    setSelectedLocation(null);
    setIsAddingParking(false);
    notifySuccess('Parking lot created successfully.');
    reloadParkingLots();
  }, [reloadParkingLots]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
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
              type="button"
              onClick={() => navigate('/my-parkings')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              My Parking Lots
            </button>
            {isParkingOwner && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 space-y-0 border-b border-slate-200 bg-white">
        <div className="px-4 py-4 sm:px-6">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
            searching={searching}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <DistanceFilter
            variant="inline"
            radiusKm={radiusKm}
            onChange={setRadiusKm}
            visibleCount={filteredParkingLots.length}
            totalCount={allParkingLots.length}
          />
          {isAddingParking ? (
            <button
              type="button"
              onClick={cancelAddParking}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:self-center"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={startAddParking}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:self-center"
            >
              + Add Parking
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-6">
        <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="h-8 w-8 text-blue-600" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <Alert variant="error" message={error} />
            </div>
          ) : (
            <div className="absolute inset-0">
              <ParkingMap
                parkingLots={filteredParkingLots}
                selectedParkingId={selectedParkingId}
                onSelect={setSelectedParkingId}
                onViewDetails={handleViewDetails}
                mapCenter={mapCenter}
                userLocation={userLocation}
                isAddingParking={isAddingParking}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          )}
        </div>

        {isAddingParking && (
          <div className="mt-4">
            <AddParkingForm
              selectedLocation={selectedLocation}
              onCreated={handleParkingCreated}
              onCancel={cancelAddParking}
            />
          </div>
        )}
      </div>
    </div>
  );
}
