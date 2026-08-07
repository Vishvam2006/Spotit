import { useCallback, useState, type RefObject } from 'react';
import Map, { type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ParkingLot } from '../../types';
import MapControls from './MapControls';
import ParkingMarker from './ParkingMarker';
import ParkingPopup from './ParkingPopup';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const HAS_MAPBOX_TOKEN =
  Boolean(MAPBOX_TOKEN) && MAPBOX_TOKEN !== 'your_mapbox_token';

const DEFAULT_VIEW = {
  latitude: 12.9716,
  longitude: 77.5946,
  zoom: 11,
};

const MISSING_TOKEN_HINT =
  'Add your Mapbox access token to frontend/.env as VITE_MAPBOX_TOKEN to display the live map.';

interface ParkingMapProps {
  lots: ParkingLot[];
  selectedId: string | null;
  mapRef: RefObject<MapRef | null>;
  onSelectLot: (lot: ParkingLot) => void;
  onViewDetails: (id: string) => void;
  className?: string;
}

export default function ParkingMap({
  lots,
  selectedId,
  mapRef,
  onSelectLot,
  onViewDetails,
  className = '',
}: ParkingMapProps) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [popupLot, setPopupLot] = useState<ParkingLot | null>(null);

  const handleMapLoad = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 12,
          duration: 900,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [mapRef]);

  const handleReset = useCallback(() => {
    const target = userLocation
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          zoom: 12,
        }
      : DEFAULT_VIEW;

    mapRef.current?.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.zoom,
      duration: 700,
    });
  }, [mapRef, userLocation]);

  const handleSelect = useCallback(
    (lot: ParkingLot) => {
      setPopupLot(lot);
      onSelectLot(lot);
    },
    [onSelectLot],
  );

  if (!HAS_MAPBOX_TOKEN) {
    return (
      <div
        className={`relative flex h-full min-h-[400px] flex-col items-center justify-center gap-3 overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center ${className}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(#CBD5E120_1px,transparent_1px),linear-gradient(90deg,#CBD5E120_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute left-[16%] top-[35%] h-2 w-[44%] rounded-full bg-white shadow-sm" />
        <div className="absolute left-[48%] top-[18%] h-[52%] w-2 rounded-full bg-white shadow-sm" />
        <div className="absolute bottom-[28%] right-[24%] h-3 w-3 rounded-full bg-[#19C7B2] ring-8 ring-teal-400/10" />
        <div className="relative rounded-[20px] border border-[#E2E8F0] bg-white/95 px-5 py-4 shadow-[0_18px_44px_rgb(15_23_42_/_0.10)]">
          <p className="text-sm font-bold text-[#0F172A]">Map unavailable</p>
          <p className="mt-2 max-w-sm text-sm text-[#64748B]">
            {MISSING_TOKEN_HINT}
          </p>
        </div>
        <p className="relative text-sm font-medium text-[#64748B]">
          {lots.length} parking locations are ready to display.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-[400px] overflow-hidden bg-[#F8FAFC] ${className}`}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={DEFAULT_VIEW}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100%' }}
      >
        {lots.map((lot) => (
          <ParkingMarker
            key={lot.id}
            lot={lot}
            selected={selectedId === lot.id}
            onSelect={handleSelect}
          />
        ))}

        {popupLot && (
          <ParkingPopup
            lot={popupLot}
            onClose={() => setPopupLot(null)}
            onViewDetails={(id) => {
              setPopupLot(null);
              onViewDetails(id);
            }}
          />
        )}

        <MapControls onReset={handleReset} />
      </Map>
    </div>
  );
}
