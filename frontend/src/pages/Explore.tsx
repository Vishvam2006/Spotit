import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  X,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ParkingMap from '../components/map/ParkingMap';
import type { MapLocation } from '../components/map/ParkingMap';
import SearchBar from '../components/map/SearchBar';
import DistanceFilter from '../components/map/DistanceFilter';
import ParkingCard from '../components/map/ParkingCard';
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
  const [isAddingParking, setIsAddingParking] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [returnToMyParkings, setReturnToMyParkings] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Bumped once per add-parking session so the mobile drawer remounts with a
  // clean form, while closing/reopening it mid-session keeps the user's input.
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
      
    void requestUserLocation();

    return () => {
      active = false;
    };
  }, [requestUserLocation]);

  useEffect(() => {
    if (searchParams.get('addParking') !== '1') return;

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
                  onClick={() => navigate(-1)}
                  aria-label="Back to Home"
                  className="pm-touch-target flex shrink-0 items-center justify-center rounded-2xl bg-[var(--pm-color-surface)]/95 text-[var(--pm-color-text)] shadow-lg shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1 rounded-2xl bg-[var(--pm-color-surface)]/95 p-3 shadow-lg shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl">
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

              {/* Filter Chips Layer (Premium Dark Style) */}
              {!isAddingParking && (
                 <div className="pointer-events-auto mx-auto mt-3 flex max-w-3xl items-center gap-2 overflow-x-auto pm-scrollbar-none">
                   {['Price', 'Distance', 'Available now', 'Covered', 'EV charging'].map(chip => (
                     <button key={chip} className="whitespace-nowrap rounded-full bg-[var(--pm-color-surface)]/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm ring-1 ring-white/10 backdrop-blur-md">
                        {chip}
                     </button>
                   ))}
                 </div>
              )}

              <div className="pointer-events-auto mx-auto mt-3 flex max-w-3xl justify-end">
                {isAddingParking ? (
                  <button
                    type="button"
                    onClick={cancelAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-700 bg-[var(--pm-color-surface)]/95 px-4 text-sm font-bold text-white shadow-lg shadow-black/30 backdrop-blur-xl transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startAddParking}
                    className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--pm-color-text)] px-4 text-sm font-bold text-[var(--pm-color-page)] shadow-lg shadow-black/40 transition-colors hover:bg-slate-200 focus:outline-none"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add parking
                  </button>
                )}
              </div>
            </div>

            {/* Mobile instruction strip */}
            {isAddingParking && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--pm-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-20 flex justify-center px-4 md:hidden">
                <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#0b1220]/95 px-5 py-3.5 text-sm text-white shadow-xl backdrop-blur-md ring-1 ring-white/10">
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

            {/* Sidebar / Bottom sheet */}
            <section
              aria-label={isAddingParking ? 'Add parking' : 'Nearby parking'}
              // In add mode the panel has no mobile content (the form lives in the
              // drawer), so it must be fully hidden below md — otherwise an empty
              // sheet covers the bottom of the map and eats the taps meant to pin
              // the location.
              className={`pm-sheet absolute inset-x-0 bottom-[calc(var(--pm-bottom-nav-height)+env(safe-area-inset-bottom))] z-20 rounded-t-3xl border-t border-[var(--pm-color-border)] px-4 pb-4 pt-3 md:bottom-6 md:left-6 md:right-auto md:w-[420px] md:rounded-2xl md:border md:p-4 bg-[var(--pm-color-surface)] ${
                isAddingParking ? 'hidden md:block' : ''
              }`}
            >
              {!isAddingParking && <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--pm-color-border-strong)] md:hidden" />}

              {isAddingParking ? (
                <div className="hidden md:block">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">Add parking</h2>
                      <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
                        Click the map to pin the parking location.
                      </p>
                    </div>
                  </div>
                  <div className="pm-scrollbar-none max-h-[60vh] overflow-y-auto pb-1 pr-1">
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
                      <h2 className="text-lg font-bold text-white">Nearby parking</h2>
                      <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
                        {visibleParkingLots.length} of {allParkingLots.length} lots in range
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--pm-color-action-soft)] px-3 py-1 text-xs font-bold text-[var(--pm-color-action)]">
                      {radiusKm} km
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-[var(--pm-color-surface-raised)] p-3 ring-1 ring-white/5">
                    <DistanceFilter
                      variant="inline"
                      radiusKm={radiusKm}
                      onChange={setRadiusKm}
                      visibleCount={visibleParkingLots.length}
                      totalCount={allParkingLots.length}
                    />
                  </div>

                  {visibleParkingLots.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-[var(--pm-color-surface-raised)] p-5 text-center">
                      <p className="text-sm font-semibold text-white">No parking lots found here</p>
                      <p className="mt-1 text-sm text-[var(--pm-color-muted)]">Try another area or increase the search radius.</p>
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
