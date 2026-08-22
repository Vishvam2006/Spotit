import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  X,
  SlidersHorizontal,
  Zap,
  Warehouse,
  Check,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ParkingMap from '../components/map/ParkingMap';
import type { MapLocation } from '../components/map/ParkingMap';
import SearchBar from '../components/map/SearchBar';
import ParkingBottomSheet from '../components/map/ParkingBottomSheet';
import AddParkingForm from '../components/parking/AddParkingForm';
import AddParkingDrawer from '../components/parking/AddParkingDrawer';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { fetchParkingLots } from '../services/parking';
import { DEFAULT_MAP_CENTER } from '../config/map';
import { geocodePlaceQuery } from '../utils/geocoding';
import { getCurrentPositionDetailed, type LatLng } from '../utils/geolocation';
import { haversineDistanceKm, isWithinRadiusKm } from '../utils/distance';
import { notifyError, notifySuccess } from '../utils/notify';
import type { ParkingLot } from '../types/parking';

const DEFAULT_RADIUS_KM = 25;
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

function filterLotsByRadius(lots: ParkingLot[], center: LatLng, radiusKm: number): ParkingLot[] {
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

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [searchLocation, setSearchLocation] = useState<LatLng | null>(null);
  const [searching, setSearching] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [showRadiusPopover, setShowRadiusPopover] = useState(false);

  // Filter states
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [filterUnder100, setFilterUnder100] = useState(false);
  const [filterCoveredOnly, setFilterCoveredOnly] = useState(false);
  const [filterEvOnly, setFilterEvOnly] = useState(false);

  // Add Parking states
  const [isAddingParking, setIsAddingParking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [returnToMyParkings, setReturnToMyParkings] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [addSessionId, setAddSessionId] = useState(0);

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
      
    // requestUserLocation awaits the geolocation prompt before writing state,
    // so nothing is set synchronously here; the rule cannot see past the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestUserLocation();

    return () => {
      active = false;
    };
  }, [requestUserLocation]);

  useEffect(() => {
    if (searchParams.get('addParking') !== '1') return;

    // Consuming a one-shot navigation instruction from the URL. It runs once and
    // clears the param below, so it cannot cascade; there is no render-time
    // equivalent because setSearchParams is a navigation, not a state write.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAddingParking(true);
    setSelectedParkingId(null);
    setSelectedLocation(null);
    setReturnToMyParkings(true);
    setAddSessionId((id) => id + 1);
    setSearchParams({}, { replace: true });
    void requestUserLocation();
  }, [requestUserLocation, searchParams, setSearchParams]);

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (latParam === null && lngParam === null) return;

    const lat = Number.parseFloat(latParam ?? '');
    const lng = Number.parseFloat(lngParam ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    // Same one-shot URL-to-state handoff: a lat/lng deep link selects the map
    // location once per navigation, keyed by the searchParams identity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchLocation({ lat, lng });
    setSelectedParkingId(null);
    setSelectedLocation(null);
    setIsAddingParking(false);
  }, [searchParams]);

  useEffect(() => {
    const trimmed = submittedSearch.trim();
    if (!trimmed) return;

    let active = true;

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
  }, [submittedSearch]);

  const parkingClusterCenter = useMemo(
    () => getParkingClusterCenter(allParkingLots),
    [allParkingLots],
  );

  const mapCenter = useMemo(
    () => searchLocation ?? userLocation ?? parkingClusterCenter ?? DEFAULT_MAP_CENTER,
    [parkingClusterCenter, searchLocation, userLocation],
  );

  // Filter lots based on radius and active quick filters
  const filteredParkingLots = useMemo(() => {
    let lots = filterLotsByRadius(allParkingLots, mapCenter, radiusKm);

    if (filterAvailableOnly) {
      lots = lots.filter((lot) => lot.availableSpaces > 0 && lot.status === 'ACTIVE');
    }

    if (filterUnder100) {
      lots = lots.filter((lot) => lot.pricePerHour <= 100);
    }

    if (filterCoveredOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('covered') ?? false) ||
        lot.name.toLowerCase().includes('covered'),
      );
    }

    if (filterEvOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('ev') ?? false) ||
        (lot.description?.toLowerCase().includes('charging') ?? false) ||
        lot.name.toLowerCase().includes('ev'),
      );
    }

    return lots;
  }, [
    allParkingLots,
    mapCenter,
    radiusKm,
    filterAvailableOnly,
    filterUnder100,
    filterCoveredOnly,
    filterEvOnly,
  ]);

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

  // Selected parking lot for the bottom sheet
  const selectedParking = useMemo(() => {
    if (!selectedParkingId) return null;
    return allParkingLots.find((lot) => lot.id === selectedParkingId) ?? null;
  }, [allParkingLots, selectedParkingId]);

  const selectedDistanceFromUser = useMemo(() => {
    if (!selectedParking || !userLocation) return undefined;
    return haversineDistanceKm(
      userLocation.lat,
      userLocation.lng,
      selectedParking.latitude,
      selectedParking.longitude,
    );
  }, [selectedParking, userLocation]);

  const selectedDistanceFromDestination = useMemo(() => {
    if (!selectedParking || !searchLocation) return undefined;
    return haversineDistanceKm(
      searchLocation.lat,
      searchLocation.lng,
      selectedParking.latitude,
      selectedParking.longitude,
    );
  }, [selectedParking, searchLocation]);

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
    const trimmed = searchQuery.trim();
    setSubmittedSearch(trimmed);
    setSelectedParkingId(null);
    setSelectedLocation(null);
    setIsAddingParking(false);
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

  const startAddParking = useCallback(() => {
    setIsAddingParking(true);
    setSelectedParkingId(null);
    setSelectedLocation(null);
    setReturnToMyParkings(false);
    setAddSessionId((id) => id + 1);
    void requestUserLocation();
  }, [requestUserLocation]);

  const cancelAddParking = useCallback(() => {
    setIsAddingParking(false);
    setSelectedLocation(null);
    setReturnToMyParkings(false);
    setMobileDrawerOpen(false);
  }, []);

  const handleLocationSelect = useCallback((location: MapLocation) => {
    setSelectedLocation(location);
    if (isAddingParking) setMobileDrawerOpen(true);
  }, [isAddingParking]);

  const handleParkingCreated = useCallback(() => {
    setSelectedLocation(null);
    setIsAddingParking(false);
    setMobileDrawerOpen(false);
    reloadParkingLots();
    notifySuccess('Parking lot created successfully.');
    if (returnToMyParkings) navigate('/my-parkings');
  }, [navigate, reloadParkingLots, returnToMyParkings]);

  return (
    <AppLayout maxWidth="max-w-none">
      <div className="relative min-h-[calc(100svh-57px)] overflow-hidden bg-[var(--pm-color-page)] md:min-h-[calc(100vh-65px)]">
        {loading ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--pm-color-page)]">
            <Spinner className="h-8 w-8 text-[var(--pm-color-action)]" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--pm-color-page)] p-6">
            <Alert variant="error" message={error} />
          </div>
        ) : (
          <>
            {/* Primary Google Map View */}
            <div className="absolute inset-0">
              <ParkingMap
                parkingLots={visibleParkingLots}
                selectedParkingId={selectedParkingId}
                onSelect={(id) => {
                  if (!isAddingParking) {
                    setSelectedParkingId(id);
                  }
                }}
                mapCenter={mapCenter}
                userLocation={userLocation}
                isAddingParking={isAddingParking}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            {/* Floating Top Bar (Search + Back + Add parking) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-3 sm:px-6">
              <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Back to Home"
                  className="pm-touch-target flex shrink-0 items-center justify-center rounded-2xl bg-[var(--pm-color-surface)]/95 text-[var(--pm-color-text)] shadow-xl shadow-black/40 ring-1 ring-[var(--pm-color-border)] backdrop-blur-xl transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="min-w-0 flex-1 rounded-2xl bg-[var(--pm-color-surface)]/95 p-2.5 shadow-xl shadow-black/40 ring-1 ring-[var(--pm-color-border)] backdrop-blur-xl">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSubmit={handleSearchSubmit}
                    onClear={handleSearchClear}
                    searching={searching}
                    compact
                  />
                </div>

                {isAddingParking ? (
                  <button
                    type="button"
                    onClick={cancelAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)]/95 px-4 text-xs font-bold text-[var(--pm-color-text)] shadow-xl shadow-black/40 backdrop-blur-xl transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[var(--pm-color-text)] px-4 text-xs font-bold text-[var(--pm-color-page)] shadow-xl shadow-black/40 transition-colors hover:bg-[var(--pm-color-muted)] focus:outline-none"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Add parking</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                )}
              </div>

              {/* Floating Filter Chips Layer */}
              {!isAddingParking && (
                <div className="pointer-events-auto relative mx-auto mt-2.5 flex max-w-3xl items-center gap-2 overflow-x-auto pb-1 pm-scrollbar-none">
                  {/* Nearby Pill & Radius Selector Toggle */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowRadiusPopover((prev) => !prev)}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--pm-color-surface)]/95 px-3.5 py-1.5 text-xs font-bold text-[var(--pm-color-action)] shadow-md ring-1 ring-[var(--pm-color-action)]/30 backdrop-blur-md transition-all hover:bg-[var(--pm-color-surface-raised)]"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      <span>{visibleParkingLots.length} spots ({radiusKm} km)</span>
                    </button>

                    {/* Radius Options Popover */}
                    {showRadiusPopover && (
                      <div className="absolute left-0 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-2 shadow-2xl backdrop-blur-xl">
                        <span className="px-2 py-1 text-[11px] font-semibold text-[var(--pm-color-muted)]">
                          Search Radius
                        </span>
                        <div className="flex gap-1">
                          {RADIUS_OPTIONS.map((km) => (
                            <button
                              key={km}
                              type="button"
                              onClick={() => {
                                setRadiusKm(km);
                                setShowRadiusPopover(false);
                              }}
                              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                                radiusKm === km
                                  ? 'bg-[var(--pm-color-action)] text-slate-950 shadow-sm'
                                  : 'text-[var(--pm-color-text)] hover:bg-[var(--pm-color-surface-raised)]'
                              }`}
                            >
                              {km} km
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Now Filter Chip */}
                  <button
                    type="button"
                    onClick={() => setFilterAvailableOnly((prev) => !prev)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 backdrop-blur-md transition-all ${
                      filterAvailableOnly
                        ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50'
                        : 'bg-[var(--pm-color-surface)]/90 text-[var(--pm-color-text)] ring-[var(--pm-color-border)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`}
                  >
                    {filterAvailableOnly && <Check className="h-3 w-3" />}
                    Available now
                  </button>

                  {/* Price Chip */}
                  <button
                    type="button"
                    onClick={() => setFilterUnder100((prev) => !prev)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 backdrop-blur-md transition-all ${
                      filterUnder100
                        ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50'
                        : 'bg-[var(--pm-color-surface)]/90 text-[var(--pm-color-text)] ring-[var(--pm-color-border)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`}
                  >
                    {filterUnder100 && <Check className="h-3 w-3" />}
                    ≤ ₹100/hr
                  </button>

                  {/* Covered Filter Chip */}
                  <button
                    type="button"
                    onClick={() => setFilterCoveredOnly((prev) => !prev)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 backdrop-blur-md transition-all ${
                      filterCoveredOnly
                        ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50'
                        : 'bg-[var(--pm-color-surface)]/90 text-[var(--pm-color-text)] ring-[var(--pm-color-border)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`}
                  >
                    <Warehouse className="h-3 w-3" />
                    Covered
                  </button>

                  {/* EV Charging Chip */}
                  <button
                    type="button"
                    onClick={() => setFilterEvOnly((prev) => !prev)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 backdrop-blur-md transition-all ${
                      filterEvOnly
                        ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50'
                        : 'bg-[var(--pm-color-surface)]/90 text-[var(--pm-color-text)] ring-[var(--pm-color-border)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    EV charging
                  </button>

                  {/* Clear all filters if any active */}
                  {(filterAvailableOnly || filterUnder100 || filterCoveredOnly || filterEvOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterAvailableOnly(false);
                        setFilterUnder100(false);
                        setFilterCoveredOnly(false);
                        setFilterEvOnly(false);
                      }}
                      className="shrink-0 rounded-full bg-[var(--pm-color-surface-raised)] px-2.5 py-1.5 text-xs font-semibold text-[var(--pm-color-muted)] hover:text-white"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile instruction strip for Add Parking */}
            {isAddingParking && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--pm-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-20 flex justify-center px-4 md:hidden">
                <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[var(--pm-color-page)]/95 px-5 py-3.5 text-sm text-[var(--pm-color-text)] shadow-xl backdrop-blur-md ring-1 ring-[var(--pm-color-border)]">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      selectedLocation
                        ? 'bg-[var(--pm-color-action)] ring-4 ring-emerald-400/25'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                    aria-hidden="true"
                  />
                  {selectedLocation ? (
                    <span className="font-semibold">
                      Location pinned —{' '}
                      <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(true)}
                        className="underline underline-offset-2 hover:text-emerald-300 focus:outline-none"
                      >
                        Fill in details
                      </button>
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--pm-color-text)]">Tap the map to pin the parking location</span>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Add Parking Floating Form */}
            {isAddingParking && (
              <section
                aria-label="Add parking"
                className="pm-sheet absolute bottom-6 left-6 z-20 hidden w-[420px] rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-4 md:block shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--pm-color-text)]">Add parking</h2>
                    <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
                      Click the map to pin the parking location.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelAddParking}
                    className="rounded-full p-1 text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="pm-scrollbar-none max-h-[60vh] overflow-y-auto pb-1 pr-1">
                  <AddParkingForm
                    selectedLocation={selectedLocation}
                    onCreated={handleParkingCreated}
                    onCancel={cancelAddParking}
                    embedded
                  />
                </div>
              </section>
            )}

            {/* Google Maps Style Bottom Sheet for ONLY the selected parking lot */}
            {selectedParking && !isAddingParking && (
              <ParkingBottomSheet
                key={selectedParking.id}
                parking={selectedParking}
                distanceFromUser={selectedDistanceFromUser}
                distanceFromDestination={selectedDistanceFromDestination}
                onClose={() => setSelectedParkingId(null)}
                onReserve={handleViewDetails}
              />
            )}

            {/* Mobile Drawer for Add Parking */}
            <AddParkingDrawer
              key={addSessionId}
              open={mobileDrawerOpen && isAddingParking}
              selectedLocation={selectedLocation}
              onCreated={handleParkingCreated}
              onCancel={() => setMobileDrawerOpen(false)}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
