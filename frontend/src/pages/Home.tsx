import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import Logo from '../components/Logo';
import ParkingList from '../components/parking/ParkingList';
import ParkingFilters, {
  type AvailabilityFilter,
  type SortOption,
} from '../components/parking/ParkingFilters';
import ParkingMap from '../components/map/ParkingMap';
import { fetchParkingLots } from '../services/parkingLots';
import { getErrorMessage } from '../services/api';
import type { ParkingLot } from '../types';

function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<SortOption>('price-asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await fetchParkingLots();
        if (!active) return;
        setLots(data);
        setError(null);
        setStatus('success');
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = lots.filter((lot) => {
      const matchesSearch =
        !query ||
        lot.name.toLowerCase().includes(query) ||
        lot.city.toLowerCase().includes(query);

      let matchesAvailability = true;
      if (availability === 'available') {
        matchesAvailability = lot.availableSpaces > 0;
      } else if (availability === 'limited') {
        matchesAvailability =
          lot.availableSpaces > 0 &&
          lot.availableSpaces / lot.totalSpaces < 0.25;
      } else if (availability === 'full') {
        matchesAvailability = lot.availableSpaces === 0;
      }

      return matchesSearch && matchesAvailability;
    });

    return [...result].sort((a, b) => {
      if (sort === 'price-asc') return a.pricePerHour - b.pricePerHour;
      if (sort === 'price-desc') return b.pricePerHour - a.pricePerHour;
      return a.name.localeCompare(b.name);
    });
  }, [lots, search, availability, sort]);

  const distances = useMemo(() => {
    const map: Record<string, number> = {};
    if (!userCoords) return map;

    for (const lot of lots) {
      map[lot.id] = haversineKm(userCoords, {
        latitude: lot.latitude,
        longitude: lot.longitude,
      });
    }
    return map;
  }, [lots, userCoords]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleViewOnMap = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleViewDetails = useCallback(
    (id: string) => {
      navigate(`/parking/${id}`);
    },
    [navigate],
  );

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
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                ParkMitra
              </span>
              <p className="text-xs text-slate-500">Find parking near you</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.fullName}
            </span>
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
        <div className="mb-6">
          <ParkingFilters
            search={search}
            availability={availability}
            sort={sort}
            onSearchChange={setSearch}
            onAvailabilityChange={setAvailability}
            onSortChange={setSort}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ParkingList
            lots={filteredLots}
            isLoading={status === 'loading'}
            isError={status === 'error'}
            errorMessage={error ?? ''}
            selectedId={selectedId}
            distances={distances}
            onRetry={handleRetry}
            onSelect={handleSelect}
            onViewOnMap={handleViewOnMap}
            onViewDetails={handleViewDetails}
          />

          <div className="self-start lg:sticky lg:top-6">
            <ParkingMap lots={filteredLots} />
          </div>
        </div>
      </main>
    </div>
  );
}
