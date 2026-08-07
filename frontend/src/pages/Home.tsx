import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MapRef } from 'react-map-gl/mapbox';
import { ChevronDown, ChevronUp, LogOut, MapPin } from 'lucide-react';
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

const FOCUS_ZOOM = 14;

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
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapRef | null>(null);

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
    setSheetExpanded(true);
  }, []);

  const handleSelectLot = useCallback((lot: ParkingLot) => {
    setSelectedId(lot.id);
    setSheetExpanded(true);
  }, []);

  const handleViewOnMap = useCallback(
    (id: string) => {
      const lot = lots.find((item) => item.id === id);
      if (!lot) return;

      setSelectedId(id);
      mapRef.current?.flyTo({
        center: [lot.longitude, lot.latitude],
        zoom: FOCUS_ZOOM,
        duration: 700,
      });
    },
    [lots],
  );

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

  const selectedLot = useMemo(
    () => lots.find((lot) => lot.id === selectedId) ?? null,
    [lots, selectedId],
  );
  const availableCount = filteredLots.filter(
    (lot) => lot.status === 'ACTIVE' && lot.availableSpaces > 0,
  ).length;

  return (
    <div className="relative h-dvh overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <ParkingMap
        lots={filteredLots}
        selectedId={selectedId}
        mapRef={mapRef}
        onSelectLot={handleSelectLot}
        onViewDetails={handleViewDetails}
        className="absolute inset-0"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between rounded-[20px] bg-[#0B1220] px-4 py-3 shadow-[0_18px_40px_rgb(15_23_42_/_0.20)]">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/assets/image.png" alt="ParkMitra" className="h-14 w-auto object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-300">
                Find parking near you
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm font-medium text-slate-300 sm:inline">
              {user?.fullName}
            </span>
            <button
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-all duration-200 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-teal-200/30"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <div className="pointer-events-none absolute inset-x-0 top-[96px] z-20 px-4 sm:px-6">
          <div className="pointer-events-auto mx-auto max-w-6xl">
            <ParkingFilters
              search={search}
              availability={availability}
              sort={sort}
              onSearchChange={setSearch}
              onAvailabilityChange={setAvailability}
              onSortChange={setSort}
            />
          </div>
        </div>

        <section
          className={`absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[64dvh] rounded-t-[28px] border border-[#E2E8F0] bg-white shadow-[0_-18px_44px_rgb(15_23_42_/_0.16)] transition-transform duration-300 sm:bottom-4 sm:left-4 sm:right-auto sm:mx-0 sm:max-h-[72dvh] sm:w-[440px] sm:rounded-[28px] ${
            sheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-132px)]'
          }`}
          aria-label="Parking results"
        >
          <button
            type="button"
            onClick={() => setSheetExpanded((current) => !current)}
            className="flex w-full items-center justify-center px-4 pt-3"
            aria-label={sheetExpanded ? 'Collapse results' : 'Expand results'}
          >
            <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          </button>

          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#19C7B2]">
                <MapPin className="h-4 w-4" />
                Nearby parking
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
                {availableCount} available spots
              </h1>
              <p className="mt-1 truncate text-sm font-medium text-[#64748B]">
                {selectedLot
                  ? selectedLot.name
                  : `${filteredLots.length} locations found`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSheetExpanded((current) => !current)}
              className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] transition-all duration-200 hover:bg-[#F8FAFC] focus:outline-none focus:ring-4 focus:ring-teal-100"
              aria-label={sheetExpanded ? 'Collapse results' : 'Expand results'}
            >
              {sheetExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="max-h-[calc(64dvh-132px)] overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:max-h-[calc(72dvh-132px)] sm:px-5">
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
          </div>
        </section>
      </main>
    </div>
  );
}
