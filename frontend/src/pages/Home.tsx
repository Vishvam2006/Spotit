import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CarFront,
  ChevronLeft,
  Clock3,
  IndianRupee,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  SquareParking,
  X,
  type LucideIcon,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ParkingMap from '../components/map/ParkingMap';
import type { MapLocation } from '../components/map/ParkingMap';
import SearchBar from '../components/map/SearchBar';
import DistanceFilter from '../components/map/DistanceFilter';
import ParkingCard from '../components/map/ParkingCard';
import AddParkingForm from '../components/parking/AddParkingForm';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { fetchParkingLots } from '../services/parking';
import { DEFAULT_MAP_CENTER } from '../config/map';
import { geocodePlaceQuery } from '../utils/geocoding';
import { getCurrentPositionDetailed } from '../utils/geolocation';
import type { LatLng } from '../utils/geolocation';
import { formatDistanceKm, haversineDistanceKm, isWithinRadiusKm } from '../utils/distance';
import { notifyError, notifySuccess } from '../utils/notify';
import type { ParkingLot } from '../types/parking';
import { useAuth } from '../context/auth-context';

const DEFAULT_RADIUS_KM = 25;

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

function getParkingClusterCenter(lots: ParkingLot[]): LatLng | null {
  if (lots.length === 0) return null;
  const totals = lots.reduce(
    (acc, lot) => ({
      lat: acc.lat + lot.latitude,
      lng: acc.lng + lot.longitude,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / lots.length,
    lng: totals.lng / lots.length,
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [searchLocation, setSearchLocation] = useState<LatLng | null>(null);
  const [searching, setSearching] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [isAddingParking, setIsAddingParking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  const requestUserLocation = useCallback(async (): Promise<LatLng | null> => {
    const result = await getCurrentPositionDetailed();
    if (result.ok) {
      setUserLocation(result.coords);
      return result.coords;
    }
    return null;
  }, []);

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
    const trimmed = submittedSearch.trim();
    if (!trimmed) return;

    let active = true;

    geocodePlaceQuery(trimmed)
      .then((location) => {
        if (!active) return;
        if (location) {
          setSearchLocation(location);
          setMapOpen(true);
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
  }, [submittedSearch]);

  const parkingClusterCenter = useMemo(
    () => getParkingClusterCenter(allParkingLots),
    [allParkingLots],
  );

  const mapCenter = useMemo(
    () => searchLocation ?? userLocation ?? parkingClusterCenter ?? DEFAULT_MAP_CENTER,
    [parkingClusterCenter, searchLocation, userLocation],
  );

  const filteredParkingLots = useMemo(
    () => filterLotsByRadius(allParkingLots, mapCenter, radiusKm),
    [allParkingLots, mapCenter, radiusKm],
  );

  const visibleParkingLots = useMemo(
    () =>
      filteredParkingLots
        .map((lot) => ({
          ...lot,
          distanceKm: haversineDistanceKm(
            mapCenter.lat,
            mapCenter.lng,
            lot.latitude,
            lot.longitude,
          ),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [filteredParkingLots, mapCenter],
  );

  const availableLots = useMemo(
    () => allParkingLots.filter((lot) => lot.status === 'ACTIVE' && lot.availableSpaces > 0),
    [allParkingLots],
  );

  const forYouLots = useMemo(
    () => visibleParkingLots.filter((lot) => lot.status === 'ACTIVE').slice(0, 4),
    [visibleParkingLots],
  );

  const cheapestLot = useMemo(
    () =>
      [...availableLots].sort(
        (a, b) => a.pricePerHour - b.pricePerHour || b.availableSpaces - a.availableSpaces,
      )[0] ?? null,
    [availableLots],
  );

  const highAvailabilityLot = useMemo(
    () =>
      [...availableLots].sort(
        (a, b) => b.availableSpaces - a.availableSpaces || a.pricePerHour - b.pricePerHour,
      )[0] ?? null,
    [availableLots],
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

  const openMap = useCallback(() => {
    setMapOpen(true);
    void requestUserLocation();
  }, [requestUserLocation]);

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    setSubmittedSearch(trimmed);
    setSelectedParkingId(null);
    setSelectedLocation(null);
    setIsAddingParking(false);
    setMapOpen(true);
    setSearching(Boolean(trimmed));
    if (!trimmed) {
      setSearchLocation(null);
      void requestUserLocation();
    }
  }, [requestUserLocation, searchQuery]);

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

  const handlePickParking = useCallback((parking: ParkingLot) => {
    setSelectedParkingId(parking.id);
    setSearchLocation({ lat: parking.latitude, lng: parking.longitude });
    setSelectedLocation(null);
    setIsAddingParking(false);
    setMapOpen(true);
  }, []);

  const startAddParking = useCallback(() => {
    setMapOpen(true);
    setIsAddingParking(true);
    setSelectedParkingId(null);
    setSelectedLocation(null);
    void requestUserLocation();
  }, [requestUserLocation]);

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

  if (!mapOpen) {
    return (
      <AppLayout>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-5 sm:px-6 md:pb-8">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <Spinner className="h-8 w-8 text-emerald-600" />
            </div>
          ) : error ? (
            <div className="mt-4">
              <Alert variant="error" message={error} />
            </div>
          ) : (
            <>
              <section className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/15 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      {getGreeting()}, {user?.fullName?.split(' ')[0] ?? 'there'}
                    </p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                      Where to?
                    </h1>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-200 ring-1 ring-white/10">
                    <SquareParking className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSearchSubmit();
                  }}
                  className="mt-7"
                >
                  <label htmlFor="home-destination" className="sr-only">
                    Where to?
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-lg shadow-black/20">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      id="home-destination"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => handleSearchChange(event.target.value)}
                      placeholder="Search destination or area"
                      className="min-h-11 min-w-0 flex-1 bg-transparent text-base font-bold text-slate-950 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
                    >
                      {searching ? 'Searching' : 'Go'}
                    </button>
                  </div>
                </form>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <QuickAction
                    icon={LocateFixed}
                    label="Near me"
                    value={`${availableLots.length} active`}
                    onClick={openMap}
                  />
                  <QuickAction
                    icon={IndianRupee}
                    label="Best price"
                    value={cheapestLot ? `₹${cheapestLot.pricePerHour}/hr` : 'Check map'}
                    onClick={() => (cheapestLot ? handlePickParking(cheapestLot) : openMap())}
                  />
                  <QuickAction
                    icon={ShieldCheck}
                    label="Most slots"
                    value={highAvailabilityLot ? `${highAvailabilityLot.availableSpaces} free` : 'Check map'}
                    onClick={() =>
                      highAvailabilityLot ? handlePickParking(highAvailabilityLot) : openMap()
                    }
                  />
                  <QuickAction
                    icon={MapIcon}
                    label="Open map"
                    value="Browse all"
                    onClick={openMap}
                  />
                </div>
              </section>

              <section className="mt-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">For You</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Smart picks based on available spaces and distance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openMap}
                    className="hidden min-h-11 rounded-full bg-white px-4 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex sm:items-center"
                  >
                    View map
                  </button>
                </div>

                <div className="pm-scrollbar-none mt-4 flex gap-4 overflow-x-auto pb-2">
                  {forYouLots.map((parking) => (
                    <ForYouParkingCard
                      key={parking.id}
                      parking={parking}
                      onOpen={() => handlePickParking(parking)}
                      onReserve={() => handleViewDetails(parking)}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-5 grid gap-4 md:grid-cols-3">
                <InfoPanel
                  icon={Clock3}
                  title="Fast reservations"
                  copy="Hold a spot quickly and manage live bookings from one place."
                />
                <InfoPanel
                  icon={Navigation}
                  title="Map-ready"
                  copy="Open the map when you need exact location, distance, and slot context."
                />
                <InfoPanel
                  icon={CarFront}
                  title="Vehicle-aware"
                  copy="Use your saved vehicles when confirming a parking reservation."
                />
              </section>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={openMap}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:max-w-xs"
                >
                  <MapIcon className="h-5 w-5" aria-hidden="true" />
                  Open map
                </button>
                <button
                  type="button"
                  onClick={startAddParking}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:max-w-xs"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Add parking
                </button>
              </div>
            </>
          )}
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-none">
      <div className="relative min-h-[calc(100svh-57px)] overflow-hidden bg-slate-100 md:min-h-[calc(100vh-65px)]">
        {loading ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white">
            <Spinner className="h-8 w-8 text-emerald-600" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-50 p-6">
            <Alert variant="error" message={error} />
          </div>
        ) : (
          <>
            <div className="absolute inset-0">
              <ParkingMap
                parkingLots={visibleParkingLots}
                selectedParkingId={selectedParkingId}
                onSelect={setSelectedParkingId}
                mapCenter={mapCenter}
                userLocation={userLocation}
                isAddingParking={isAddingParking}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-3 sm:px-6">
              <div className="pointer-events-auto mx-auto flex max-w-3xl gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMapOpen(false);
                    setIsAddingParking(false);
                    setSelectedLocation(null);
                  }}
                  aria-label="Back to Home"
                  className="pm-touch-target flex shrink-0 items-center justify-center rounded-2xl bg-white/95 text-slate-800 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur-xl transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1 rounded-2xl bg-white/95 p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur-xl">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSubmit={handleSearchSubmit}
                    onClear={handleSearchClear}
                    searching={searching}
                    compact
                  />
                </div>
              </div>

              <div className="pointer-events-auto mx-auto mt-3 flex max-w-3xl justify-end">
                {isAddingParking ? (
                  <button
                    type="button"
                    onClick={cancelAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/95 px-4 text-sm font-bold text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add parking
                  </button>
                )}
              </div>
            </div>

            <section
              aria-label={isAddingParking ? 'Add parking' : 'Nearby parking'}
              className="pm-sheet absolute inset-x-0 bottom-[calc(var(--pm-bottom-nav-height)+env(safe-area-inset-bottom))] z-20 rounded-t-3xl border-t border-slate-200 px-4 pb-4 pt-3 md:bottom-6 md:left-6 md:right-auto md:w-[420px] md:rounded-2xl md:border md:p-4"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />

              {isAddingParking ? (
                <div>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">Add parking</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Tap the map to pin the parking location.
                      </p>
                    </div>
                    <SquareParking
                      className="mt-1 h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pm-scrollbar-none max-h-[42vh] overflow-y-auto pb-1 pr-1 md:max-h-[60vh]">
                    <AddParkingForm
                      selectedLocation={selectedLocation}
                      onCreated={handleParkingCreated}
                      onCancel={cancelAddParking}
                      embedded
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">Nearby parking</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {visibleParkingLots.length} of {allParkingLots.length} lots in range
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {radiusKm} km
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <DistanceFilter
                      variant="inline"
                      radiusKm={radiusKm}
                      onChange={setRadiusKm}
                      visibleCount={visibleParkingLots.length}
                      totalCount={allParkingLots.length}
                    />
                  </div>

                  {visibleParkingLots.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                      <p className="text-sm font-semibold text-slate-800">
                        No parking lots found here
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another area or increase the search radius.
                      </p>
                    </div>
                  ) : (
                    <div className="pm-scrollbar-none mt-4 max-h-[34vh] space-y-3 overflow-y-auto pb-1 pr-1 md:max-h-[58vh]">
                      {visibleParkingLots.map((parking) => (
                        <ParkingCard
                          key={parking.id}
                          parking={parking}
                          selected={parking.id === selectedParkingId}
                          onSelect={(lot) => setSelectedParkingId(lot.id)}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function QuickAction({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-24 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/10 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      <Icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      <span className="mt-3 block text-sm font-black text-white">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-300">{value}</span>
    </button>
  );
}

function ForYouParkingCard({
  parking,
  onOpen,
  onReserve,
}: {
  parking: ParkingLot;
  onOpen: () => void;
  onReserve: () => void;
}) {
  return (
    <article className="w-[280px] shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950">{parking.name}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{parking.address}</span>
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          {parking.distanceKm === undefined ? 'Near' : formatDistanceKm(parking.distanceKm)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500">
        <div>
          <p>Price</p>
          <p className="mt-1 text-sm font-black text-slate-950">₹{parking.pricePerHour}/hr</p>
        </div>
        <div>
          <p>Slots</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {parking.availableSpaces}/{parking.totalSpaces}
          </p>
        </div>
        <div>
          <p>Status</p>
          <p className="mt-1 text-sm font-black text-emerald-700">Open</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-900 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Map
        </button>
        <button
          type="button"
          onClick={onReserve}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Reserve
        </button>
      </div>
    </article>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p>
    </article>
  );
}
