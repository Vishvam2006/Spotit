import { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import type { ParkingLot } from '../../types/parking';
import type { LatLng } from '../../utils/geolocation';
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  GOOGLE_MAPS_LIBRARIES,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../config/map';
import ParkingMarker from './ParkingMarker';
import UserLocationMarker from './UserLocationMarker';
import MapControls from './MapControls';
import Spinner from '../ui/Spinner';

export interface MapLocation {
  lat: number;
  lng: number;
}

interface ParkingMapProps {
  parkingLots: ParkingLot[];
  selectedParkingId: string | null;
  onSelect: (id: string | null) => void;
  mode?: 'browse' | 'select';
  onLocationSelect?: (location: MapLocation) => void;
  isAddingParking?: boolean;
  selectedLocation?: MapLocation | null;
  mapCenter?: LatLng | null;
  userLocation?: LatLng | null;
}

export default function ParkingMap({
  parkingLots,
  selectedParkingId,
  onSelect,
  mode = 'browse',
  onLocationSelect,
  isAddingParking = false,
  selectedLocation = null,
  mapCenter = null,
  userLocation = null,
}: ParkingMapProps) {
  const [loadError, setLoadError] = useState(false);
  const [mapView, setMapView] = useState<'roadmap' | 'satellite'>('roadmap');

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <MapFallback message="Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY and restart the app." />
    );
  }

  const handleMapClick = (event: MapMouseEvent) => {
    if (onLocationSelect && (isAddingParking || mode === 'select')) {
      const latLng = event.detail.latLng;
      if (latLng) onLocationSelect(latLng);
      return;
    }
    // Clicking an empty area of the map deselects parking
    onSelect(null);
  };

  return (
    <div className="absolute inset-0">
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAPS_LIBRARIES}
        onError={() => setLoadError(true)}
      >
        <Map
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          defaultCenter={DEFAULT_MAP_CENTER}
          defaultZoom={DEFAULT_MAP_ZOOM}
          mapId={GOOGLE_MAPS_MAP_ID}
          mapTypeId={mapView === 'satellite' ? 'hybrid' : 'roadmap'}
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI
        >
          {parkingLots.map((parking) => (
            <ParkingMarker
              key={parking.id}
              parking={parking}
              selected={parking.id === selectedParkingId}
              onSelect={(p) => onSelect(p.id)}
            />
          ))}

          {userLocation && <UserLocationMarker position={userLocation} />}

          {selectedLocation && (
            <AdvancedMarker
              position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              title="Selected parking location"
              zIndex={30}
            >
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute h-14 w-14 animate-ping rounded-full bg-emerald-500/25" />
                <span className="absolute h-11 w-11 rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/30" />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-xl shadow-emerald-950/35">
                  <MapPin className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="absolute top-full mt-1 whitespace-nowrap rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                  New parking
                </span>
              </div>
            </AdvancedMarker>
          )}

          <CameraController
            mapCenter={mapCenter}
            parkingLots={parkingLots}
            selectedParkingId={selectedParkingId}
          />

          <MapTypeController mapView={mapView} />

          <MapControls
            userLocation={userLocation}
            mapView={mapView}
            onMapViewChange={setMapView}
          />
        </Map>

        <MapStatus loadError={loadError} />
      </APIProvider>
    </div>
  );
}

function MapTypeController({ mapView }: { mapView: 'roadmap' | 'satellite' }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapView === 'satellite' ? 'hybrid' : 'roadmap');
  }, [map, mapView]);

  return null;
}

function CameraController({
  mapCenter,
  parkingLots,
  selectedParkingId,
}: {
  mapCenter: LatLng | null;
  parkingLots: ParkingLot[];
  selectedParkingId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapCenter) return;
    map.panTo(mapCenter);
    map.setZoom(14);
  }, [map, mapCenter]);

  useEffect(() => {
    if (!map || !selectedParkingId) return;
    const parking = parkingLots.find((lot) => lot.id === selectedParkingId);
    if (!parking) return;
    map.panTo({ lat: parking.latitude, lng: parking.longitude });
    map.setZoom(15);
  }, [map, parkingLots, selectedParkingId]);

  return null;
}

function MapStatus({ loadError }: { loadError: boolean }) {
  const status = useApiLoadingStatus();

  if (
    loadError ||
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--pm-color-surface-raised)] p-6">
        <p className="text-center text-sm font-medium text-[var(--pm-color-muted)]">
          We couldn't load the map. Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (status === APILoadingStatus.LOADING || status === APILoadingStatus.NOT_LOADED) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--pm-color-surface)]/80">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  return null;
}

function MapFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--pm-color-surface-raised)] p-6">
      <p className="text-center text-sm font-medium text-[var(--pm-color-muted)]">{message}</p>
    </div>
  );
}
