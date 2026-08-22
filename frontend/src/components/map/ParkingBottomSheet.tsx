import { useState, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  X,
  Shield,
  Video,
  Zap,
  Warehouse,
  Clock,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import ConfidenceBadge from '../continuity/ConfidenceBadge';
import type { ParkingLot } from '../../types/parking';
import { formatDistanceKm } from '../../utils/distance';
import { getMarkerAvailability, MARKER_COLORS } from '../../utils/markerAvailability';

interface ParkingBottomSheetProps {
  parking: ParkingLot;
  distanceFromUser?: number;
  distanceFromDestination?: number;
  onClose: () => void;
  onReserve: (parking: ParkingLot) => void;
}

const DEFAULT_HEIGHT_PX = 380;
const MIN_HEIGHT_PX = 220;
const MAX_HEIGHT_RATIO = 0.88; // 88% of viewport height

export default function ParkingBottomSheet({
  parking,
  distanceFromUser,
  distanceFromDestination,
  onClose,
  onReserve,
}: ParkingBottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.max(MIN_HEIGHT_PX, Math.min(window.innerHeight * 0.52, 440));
    }
    return DEFAULT_HEIGHT_PX;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(DEFAULT_HEIGHT_PX);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { color, label } = getMarkerAvailability(parking);
  const markerColor = MARKER_COLORS[color];
  const allPhotos = parking.photos && parking.photos.length > 0
    ? parking.photos
    : parking.imageUrl
    ? [parking.imageUrl]
    : [];

  const isAvailable = parking.status === 'ACTIVE' && parking.availableSpaces > 0;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only initiate drag on primary button
    if (e.button !== 0) return;
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = sheetHeight;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [sheetHeight]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.clientY; // Dragging UP increases height
    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
    const nextHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT_PX, startHeightRef.current + deltaY));
    setSheetHeight(nextHeight);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, [isDragging]);

  const toggleExpand = useCallback(() => {
    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
    const midHeight = Math.min(window.innerHeight * 0.52, 440);

    if (sheetHeight > midHeight + 80) {
      setSheetHeight(midHeight);
    } else {
      setSheetHeight(maxHeight);
    }
  }, [sheetHeight]);

  const isNearMax = sheetHeight > window.innerHeight * 0.7;

  return (
    <div
      ref={sheetRef}
      style={{ height: `${sheetHeight}px` }}
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)] shadow-2xl shadow-black/80 backdrop-blur-2xl transition-[height] duration-150 md:bottom-6 md:left-1/2 md:w-[540px] md:-translate-x-1/2 md:rounded-3xl md:border ${
        isDragging ? 'transition-none select-none' : 'ease-out'
      }`}
    >
      {/* Drag Handle & Top Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex cursor-grab touch-none flex-col items-center pb-2 pt-3 active:cursor-grabbing"
      >
        <div className="h-1.5 w-12 rounded-full bg-[var(--pm-color-border-strong)] hover:bg-[var(--pm-color-muted)] transition-colors" />
        
        {/* Quick Expand Toggle & Close Button */}
        <div className="absolute right-3.5 top-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={isNearMax ? 'Collapse view' : 'Extend view'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-border-strong)] hover:text-[var(--pm-color-text)] focus:outline-none"
          >
            {isNearMax ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-border-strong)] hover:text-[var(--pm-color-text)] focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="pm-scrollbar-none flex-1 overflow-y-auto px-4 pb-20 pt-1 sm:px-6">
        {/* Photo Gallery / Hero Image */}
        {allPhotos.length > 0 ? (
          <div className="mb-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--pm-color-surface-raised)] shadow-md ring-1 ring-[var(--pm-color-border)]">
              <img
                src={allPhotos[selectedPhotoIndex]}
                alt={parking.name}
                className="h-full w-full object-cover transition-opacity duration-300"
              />
              <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
                {selectedPhotoIndex + 1} / {allPhotos.length}
              </div>
            </div>

            {/* Thumbnail selector if multiple photos */}
            {allPhotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 pm-scrollbar-none">
                {allPhotos.map((photo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                      selectedPhotoIndex === index
                        ? 'ring-[var(--pm-color-action)] scale-105'
                        : 'opacity-60 hover:opacity-100 ring-transparent'
                    }`}
                  >
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Title, Address & Status Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[var(--pm-color-text)] tracking-tight truncate">
              {parking.name}
            </h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--pm-color-muted)]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pm-color-action)]" aria-hidden="true" />
              <span className="line-clamp-2">
                {parking.address}, {parking.city}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm"
              style={{
                backgroundColor: `${markerColor}20`,
                color: markerColor,
                border: `1px solid ${markerColor}40`,
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: markerColor }} />
              {label}
            </span>
            {parking.availabilityConfidence !== 'HIGH' && (
              <ConfidenceBadge
                confidence={parking.availabilityConfidence}
                size="sm"
                className="text-right"
              />
            )}
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-2xl bg-[var(--pm-color-surface-raised)] p-3 ring-1 ring-[var(--pm-color-border)]">
          <div className="text-center">
            <p className="text-[11px] font-medium text-[var(--pm-color-muted)]">Price</p>
            <p className="mt-0.5 text-base font-black text-[var(--pm-color-text)]">
              ₹{parking.pricePerHour}
              <span className="text-xs font-normal text-[var(--pm-color-muted)]">/hr</span>
            </p>
          </div>
          <div className="text-center border-x border-[var(--pm-color-border-strong)]">
            <p className="text-[11px] font-medium text-[var(--pm-color-muted)]">Available</p>
            <p className="mt-0.5 text-base font-black text-[var(--pm-color-action)]">
              {parking.availableSpaces}
              <span className="text-xs font-normal text-[var(--pm-color-muted)]">/{parking.totalSpaces}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-[var(--pm-color-muted)]">Distance</p>
            <p className="mt-0.5 text-base font-black text-[var(--pm-color-text)]">
              {distanceFromUser !== undefined
                ? formatDistanceKm(distanceFromUser)
                : parking.distanceKm !== undefined
                ? formatDistanceKm(parking.distanceKm)
                : 'Nearby'}
            </p>
          </div>
        </div>

        {/* Distance Sub-info if destination is set */}
        {distanceFromDestination !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 px-1 text-xs text-[var(--pm-color-muted)]">
            <Navigation className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              <strong className="text-[var(--pm-color-text)]">{formatDistanceKm(distanceFromDestination)}</strong> from your destination search
            </span>
          </div>
        )}

        {/* Description Section */}
        {parking.description && (
          <div className="mt-4 rounded-xl bg-[var(--pm-color-surface-raised)]/60 p-3.5 ring-1 ring-[var(--pm-color-border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--pm-color-muted)]">
              Description
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--pm-color-text)]">
              {parking.description}
            </p>
          </div>
        )}

        {/* Features & Amenities */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--pm-color-muted)] mb-2.5">
            Amenities & Features
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Warehouse className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>Covered Parking</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Video className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>24/7 CCTV Surveillance</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Shield className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>Gated & Guarded</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Zap className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>EV Charging Ready</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Clock className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>Instant Entry Access</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pm-color-surface-raised)]/70 p-2.5 text-[var(--pm-color-text)] ring-1 ring-[var(--pm-color-border)]">
              <Sparkles className="h-4 w-4 text-[var(--pm-color-action)]" />
              <span>Paved & Lit Surface</span>
            </div>
          </div>
        </div>

        {/* Operating Status Note */}
        {parking.status !== 'ACTIVE' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300 ring-1 ring-amber-500/20">
            <Info className="h-4 w-4 shrink-0" />
            <span>This parking lot is currently not accepting new reservations.</span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)]/95 p-3.5 backdrop-blur-xl md:rounded-b-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-[var(--pm-color-muted)]">Rate</p>
            <p className="text-lg font-black text-[var(--pm-color-text)]">
              ₹{parking.pricePerHour}
              <span className="text-xs font-normal text-[var(--pm-color-muted)]"> / hr</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => onReserve(parking)}
            disabled={!isAvailable}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--pm-color-text)] px-6 text-sm font-bold text-[var(--pm-color-page)] shadow-lg shadow-black/40 transition-all hover:bg-[var(--pm-color-muted)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{isAvailable ? 'Reserve Spot' : 'Spot Unavailable'}</span>
            <Navigation className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
