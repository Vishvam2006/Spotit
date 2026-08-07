import { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { ParkingLot } from '../../types/parking';
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../config/map';
import ParkingMarker from './ParkingMarker';
import ParkingPopup from './ParkingPopup';
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
  onViewDetails?: (parking: ParkingLot) => void;
  mode?: 'browse' | 'select';
  onLocationSelect?: (location: MapLocation) => void;
  isAddingParking?: boolean;
  selectedLocation?: MapLocation | null;
}

export default function ParkingMap({
  parkingLots,
  selectedParkingId,
  onSelect,
  onViewDetails,
  mode = 'browse',
  onLocationSelect,
  isAddingParking = false,
  selectedLocation = null,
}: ParkingMapProps) {
  const [loadError, setLoadError] = useState(false);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <MapFallback message="Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY and restart the app." />
    );
  }

  const selectedParking =
    parkingLots.find((parking) => parking.id === selectedParkingId) ?? null;

  const handleMapClick = (event: MapMouseEvent) => {
    if (!onLocationSelect || !(isAddingParking || mode === 'select')) return;
    const latLng = event.detail.latLng;
    if (latLng) onLocationSelect(latLng);
  };

  return (
    <div className="relative h-full w-full">
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAPS_LIBRARIES}
        onError={() => setLoadError(true)}
      >
        <Map
          className="h-full w-full"
          defaultCenter={DEFAULT_MAP_CENTER}
          defaultZoom={DEFAULT_MAP_ZOOM}
          onClick={handleMapClick}
        >
          {parkingLots.map((parking) => (
            <ParkingMarker
              key={parking.id}
              parking={parking}
              selected={parking.id === selectedParkingId}
              onSelect={(p) => onSelect(p.id)}
            />
          ))}

          {selectedParking && onViewDetails && (
            <ParkingPopup
              parking={selectedParking}
              onClose={() => onSelect(null)}
              onViewDetails={onViewDetails}
            />
          )}

          {selectedLocation && (
            <AdvancedMarker
              position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              title="Selected parking location"
              zIndex={2}
            >
              <Pin background="#2563eb" borderColor="#1d4ed8" glyphColor="#ffffff" />
            </AdvancedMarker>
          )}

          <CameraController parkingLots={parkingLots} selectedParkingId={selectedParkingId} />

          <MapControls />
        </Map>

        <MapStatus loadError={loadError} />
      </APIProvider>
    </div>
  );
}

function CameraController({
  parkingLots,
  selectedParkingId,
}: {
  parkingLots: ParkingLot[];
  selectedParkingId: string | null;
}) {
  const map = useMap();

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
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-sm font-medium text-slate-600">
          We couldn't load the map. Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (status === APILoadingStatus.LOADING || status === APILoadingStatus.NOT_LOADED) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return null;
}

function MapFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200">
      <p className="text-center text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}