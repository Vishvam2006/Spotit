import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  X,
  SlidersHorizontal,
  Zap,
  Warehouse,
  Check,
  MapPin,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ParkingMap from '../components/map/ParkingMap';
import type { MapLocation, DestinationLocation } from '../components/map/ParkingMap';
import ParkingBottomSheet from '../components/map/ParkingBottomSheet';
import ExploreFiltersModal, { type ExploreFiltersState } from '../components/map/ExploreFiltersModal';
import SearchAutocomplete from '../components/map/SearchAutocomplete';
import AddParkingForm from '../components/parking/AddParkingForm';
import AddParkingDrawer from '../components/parking/AddParkingDrawer';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { fetchParkingLots } from '../services/parking';
import { DEFAULT_MAP_CENTER } from '../config/map';
import { geocodePlaceQuery } from '../utils/geocoding';
import type { PlaceSuggestion } from '../services/places';
import { getCurrentPositionDetailed, type LatLng } from '../utils/geolocation';
import { haversineDistanceKm, isWithinRadiusKm } from '../utils/distance';
import { notifyError, notifySuccess } from '../utils/notify';
import { useAuth } from '../context/auth-context';
import type { ParkingLot } from '../types/parking';

const DEFAULT_RADIUS_KM = 25;

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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<DestinationLocation | null>(null);
  const [searching, setSearching] = useState(false);

  // Fully adjustable filters state
  const [filters, setFilters] = useState<ExploreFiltersState>({
    radiusKm: DEFAULT_RADIUS_KM,
    maxPrice: null,
    availableOnly: false,
    coveredOnly: false,
    evOnly: false,
    cctvOnly: false,
    securityOnly: false,
    sortBy: 'nearest',
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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
    const qParam = searchParams.get('q');

    if (latParam !== null && lngParam !== null) {
      const lat = Number.parseFloat(latParam);
      const lng = Number.parseFloat(lngParam);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setDestinationLocation({ lat, lng, title: 'Selected Location' });
        setSelectedParkingId(null);
        setSelectedLocation(null);
        setIsAddingParking(false);
      }
    } else if (qParam && qParam.trim()) {
      const query = qParam.trim();
      setSearchQuery(query);
      geocodePlaceQuery(query).then((loc) => {
        if (loc) {
          setDestinationLocation({ lat: loc.lat, lng: loc.lng, title: query });
        }
      });
    }
  }, [searchParams]);

  const parkingClusterCenter = useMemo(
    () => getParkingClusterCenter(allParkingLots),
    [allParkingLots],
  );

  const mapCenter = useMemo(
    () => destinationLocation ?? userLocation ?? parkingClusterCenter ?? DEFAULT_MAP_CENTER,
    [parkingClusterCenter, destinationLocation, userLocation],
  );

  // Filter lots based on radius and active adjustable filters
  const filteredParkingLots = useMemo(() => {
    let lots = filterLotsByRadius(allParkingLots, mapCenter, filters.radiusKm);

    if (filters.availableOnly) {
      lots = lots.filter((lot) => lot.availableSpaces > 0 && lot.status === 'ACTIVE');
    }

    if (filters.maxPrice !== null) {
      lots = lots.filter((lot) => lot.pricePerHour <= filters.maxPrice!);
    }

    if (filters.coveredOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('covered') ?? false) ||
        lot.name.toLowerCase().includes('covered'),
      );
    }

    if (filters.evOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('ev') ?? false) ||
        (lot.description?.toLowerCase().includes('charging') ?? false) ||
        lot.name.toLowerCase().includes('ev'),
      );
    }

    if (filters.cctvOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('cctv') ?? false) ||
        (lot.description?.toLowerCase().includes('camera') ?? false),
      );
    }

    if (filters.securityOnly) {
      lots = lots.filter((lot) =>
        (lot.description?.toLowerCase().includes('security') ?? false) ||
        (lot.description?.toLowerCase().includes('guard') ?? false),
      );
    }

    return lots;
  }, [allParkingLots, mapCenter, filters]);

  const visibleParkingLots = useMemo(() => {
    const withDistance = filteredParkingLots.map((lot) => ({
      ...lot,
      distanceKm: haversineDistanceKm(
        mapCenter.lat,
        mapCenter.lng,
        lot.latitude,
        lot.longitude,
      ),
    }));

    if (filters.sortBy === 'cheapest') {
      return withDistance.sort((a, b) => a.pricePerHour - b.pricePerHour);
    }
    if (filters.sortBy === 'available') {
      return withDistance.sort((a, b) => b.availableSpaces - a.availableSpaces);
    }
    // Default: nearest
    return withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filteredParkingLots, mapCenter, filters.sortBy]);

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
    if (!selectedParking || !destinationLocation) return undefined;
    return haversineDistanceKm(
      destinationLocation.lat,
      destinationLocation.lng,
      selectedParking.latitude,
      selectedParking.longitude,
    );
  }, [selectedParking, destinationLocation]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.radiusKm !== DEFAULT_RADIUS_KM) count++;
    if (filters.maxPrice !== null) count++;
    if (filters.availableOnly) count++;
    if (filters.coveredOnly) count++;
    if (filters.evOnly) count++;
    if (filters.cctvOnly) count++;
    if (filters.securityOnly) count++;
    if (filters.sortBy !== 'nearest') count++;
    return count;
  }, [filters]);

  const handleSelectPlace = useCallback((suggestion: PlaceSuggestion) => {
    setSearchQuery(suggestion.title);
    setDestinationLocation({
      lat: suggestion.location.lat,
      lng: suggestion.location.lng,
      title: suggestion.title,
    });
    if (suggestion.parkingLot) {
      setSelectedParkingId(suggestion.parkingLot.id);
    } else {
      setSelectedParkingId(null);
    }
    setSelectedLocation(null);
    setIsAddingParking(false);
    setSearching(false);
  }, []);

  const handleSearchSubmitText = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setSelectedLocation(null);
    setIsAddingParking(false);

    geocodePlaceQuery(trimmed)
      .then((location) => {
        if (location) {
          setDestinationLocation({
            lat: location.lat,
            lng: location.lng,
            title: trimmed,
          });
          setSelectedParkingId(null);
        } else {
          notifyError('Could not find that location. Try another search.');
        }
      })
      .catch(() => {
        notifyError('Search failed. Please try again.');
      })
      .finally(() => {
        setSearching(false);
      });
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setDestinationLocation(null);
    setSelectedParkingId(null);
    setSearching(false);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    setSearchQuery('');
    setDestinationLocation(null);
    setSelectedParkingId(null);
    setSearching(false);
    void requestUserLocation();
  }, [requestUserLocation]);

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
                destinationLocation={destinationLocation}
                isAddingParking={isAddingParking}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            {/* Google Maps Style Top Floating Search Pill & Filter Chips */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6">
              <div className="pointer-events-auto mx-auto max-w-3xl">
                {/* Search Autocomplete Pill */}
                <SearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelectPlace={handleSelectPlace}
                  onSubmitText={handleSearchSubmitText}
                  onClear={handleSearchClear}
                  onUseCurrentLocation={handleUseCurrentLocation}
                  userLocation={userLocation}
                  parkingLots={allParkingLots}
                  placeholder="Search destination, area, or parking..."
                  isSearching={searching}
                  rightAction={
                    isAddingParking ? (
                      <button
                        type="button"
                        onClick={cancelAddParking}
                        className="flex h-8 items-center gap-1 rounded-full bg-red-500/20 px-3 text-xs font-bold text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/30 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(user?.role === 'OWNER' ? '/dashboard' : '/bookings')}
                        aria-label="Profile"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-xs ring-2 ring-emerald-400/40 shadow-sm transition-transform active:scale-95"
                      >
                        {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                      </button>
                    )
                  }
                />

                {!isAddingParking && (
                  <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 pm-scrollbar-none">
                    {/* Destination Active Indicator Chip */}
                    {destinationLocation && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-200 shadow-sm">
                        <MapPin className="h-3.5 w-3.5 text-rose-400" />
                        <span className="truncate max-w-[130px]">Near {destinationLocation.title || 'Destination'}</span>
                        <button
                          type="button"
                          onClick={handleSearchClear}
                          aria-label="Clear destination"
                          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/40 text-rose-100 hover:bg-rose-500 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Main Filters Button */}
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black shadow-md transition-all ${
                        activeFiltersCount > 0
                          ? 'bg-emerald-400 text-slate-950 ring-2 ring-white shadow-emerald-500/40 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-white border border-[#272732] hover:bg-[#22222a]'
                      }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                    </button>

                    {/* Radius Chip */}
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters.radiusKm !== DEFAULT_RADIUS_KM
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-neutral-300 border border-[#272732] hover:text-white hover:bg-[#22222a]'
                      }`}
                    >
                      <span>{visibleParkingLots.length} in {filters.radiusKm} km</span>
                    </button>

                    {/* Max Price Chip */}
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters.maxPrice !== null
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-neutral-300 border border-[#272732] hover:text-white hover:bg-[#22222a]'
                      }`}
                    >
                      <span>{filters.maxPrice !== null ? `≤ ₹${filters.maxPrice}/hr` : 'Max Price'}</span>
                    </button>

                    {/* Available Now Filter Chip */}
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, availableOnly: !prev.availableOnly }))}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters.availableOnly
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-neutral-200 border border-[#272732] hover:bg-[#22222a]'
                      }`}
                    >
                      {filters.availableOnly && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      Available now
                    </button>

                    {/* Covered Filter Chip */}
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, coveredOnly: !prev.coveredOnly }))}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters.coveredOnly
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-neutral-200 border border-[#272732] hover:bg-[#22222a]'
                      }`}
                    >
                      <Warehouse className="h-3.5 w-3.5" />
                      {filters.coveredOnly && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      Covered
                    </button>

                    {/* EV Charging Chip */}
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, evOnly: !prev.evOnly }))}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        filters.evOnly
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-[#18181d]/95 text-neutral-200 border border-[#272732] hover:bg-[#22222a]'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {filters.evOnly && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      EV charging
                    </button>

                    {/* Add Parking */}
                    <button
                      type="button"
                      onClick={startAddParking}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#18181d]/95 border border-[#272732] px-3.5 py-1.5 text-xs font-bold text-neutral-200 hover:bg-[#22222a] hover:text-white transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add spot</span>
                    </button>

                    {/* Reset all button if any filter is active */}
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            radiusKm: DEFAULT_RADIUS_KM,
                            maxPrice: null,
                            availableOnly: false,
                            coveredOnly: false,
                            evOnly: false,
                            cctvOnly: false,
                            securityOnly: false,
                            sortBy: 'nearest',
                          })
                        }
                        className="shrink-0 rounded-full bg-[#202028] px-2.5 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile instruction strip for Add Parking */}
            {isAddingParking && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--pm-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-20 flex justify-center px-4 md:hidden">
                <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#121216]/95 px-5 py-3.5 text-sm text-white shadow-xl backdrop-blur-md ring-1 ring-[#272732]">
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
                    <span className="font-semibold text-white">Tap the map to pin the parking location</span>
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

            {/* Fully Adjustable Filters Modal */}
            <ExploreFiltersModal
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
              filters={filters}
              onApply={setFilters}
              totalMatchingCount={visibleParkingLots.length}
            />

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
