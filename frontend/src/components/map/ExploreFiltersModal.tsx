import { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Warehouse,
  Zap,
  Shield,
  Video,
  Check,
} from 'lucide-react';
import { formatDistanceKm } from '../../utils/distance';

export interface ExploreFiltersState {
  radiusKm: number;
  maxPrice: number | null;
  availableOnly: boolean;
  coveredOnly: boolean;
  evOnly: boolean;
  cctvOnly: boolean;
  securityOnly: boolean;
  sortBy: 'nearest' | 'cheapest' | 'available';
}

interface ExploreFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ExploreFiltersState;
  onApply: (newFilters: ExploreFiltersState) => void;
  totalMatchingCount: number;
}

const RADIUS_PRESETS = [5, 10, 25, 50, 100];
const MAX_PRICE_LIMIT = 500;

export default function ExploreFiltersModal({
  isOpen,
  onClose,
  filters,
  onApply,
  totalMatchingCount,
}: ExploreFiltersModalProps) {
  const [draft, setDraft] = useState<ExploreFiltersState>(filters);

  if (!isOpen) return null;

  const handleReset = () => {
    const defaultState: ExploreFiltersState = {
      radiusKm: 25,
      maxPrice: null,
      availableOnly: false,
      coveredOnly: false,
      evOnly: false,
      cctvOnly: false,
      securityOnly: false,
      sortBy: 'nearest',
    };
    setDraft(defaultState);
  };

  const handleSave = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-[var(--pm-color-border-strong)] bg-[var(--pm-color-surface)] shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--pm-color-border)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-action)]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--pm-color-text)]">Adjust Filters</h2>
              <p className="text-xs text-[var(--pm-color-muted)]">Customize search area, price and amenities</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-border-strong)] hover:text-[var(--pm-color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Filter Options */}
        <div className="pm-scrollbar-none flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Search Radius Slider */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="radius-slider" className="text-sm font-bold text-[var(--pm-color-text)]">
                Search Radius
              </label>
              <span className="rounded-full bg-[var(--pm-color-action-soft)] px-3 py-0.5 text-xs font-black text-[var(--pm-color-action)]">
                {formatDistanceKm(draft.radiusKm)}
              </span>
            </div>
            
            <input
              id="radius-slider"
              type="range"
              min={1}
              max={100}
              step={1}
              value={draft.radiusKm}
              onChange={(e) => setDraft((prev) => ({ ...prev, radiusKm: Number(e.target.value) }))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--pm-color-surface-raised)] accent-[var(--pm-color-action)]"
            />

            {/* Radius Preset Quick Buttons */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {RADIUS_PRESETS.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, radiusKm: km }))}
                  className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                    draft.radiusKm === km
                      ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-105'
                      : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:text-white'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="border-t border-[var(--pm-color-border)] pt-5">
            <div className="flex items-center justify-between">
              <label htmlFor="price-slider" className="text-sm font-bold text-[var(--pm-color-text)]">
                Max Price per Hour
              </label>
              <span className="rounded-full bg-[var(--pm-color-action-soft)] px-3 py-0.5 text-xs font-black text-[var(--pm-color-action)]">
                {draft.maxPrice !== null ? `≤ ₹${draft.maxPrice}/hr` : 'Any Price'}
              </span>
            </div>

            <input
              id="price-slider"
              type="range"
              min={10}
              max={MAX_PRICE_LIMIT}
              step={10}
              value={draft.maxPrice ?? MAX_PRICE_LIMIT}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  maxPrice: val >= MAX_PRICE_LIMIT ? null : val,
                }));
              }}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--pm-color-surface-raised)] accent-[var(--pm-color-action)]"
            />

            <div className="mt-1.5 flex justify-between text-[11px] text-[var(--pm-color-muted)]">
              <span>₹10/hr</span>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, maxPrice: null }))}
                className="underline hover:text-white"
              >
                Reset Price Limit
              </button>
              <span>₹500+/hr</span>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="border-t border-[var(--pm-color-border)] pt-5">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--pm-color-text)]">Available Spaces Only</p>
                <p className="text-xs text-[var(--pm-color-muted)]">Hide fully occupied or inactive lots</p>
              </div>
              <input
                type="checkbox"
                checked={draft.availableOnly}
                onChange={(e) => setDraft((prev) => ({ ...prev, availableOnly: e.target.checked }))}
                className="h-5 w-5 rounded-md border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-emerald-500 focus:ring-emerald-400"
              />
            </label>
          </div>

          {/* Sort By */}
          <div className="border-t border-[var(--pm-color-border)] pt-5">
            <p className="text-sm font-bold text-[var(--pm-color-text)] mb-2.5">Sort Results By</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'nearest' as const, label: 'Nearest' },
                { id: 'cheapest' as const, label: 'Cheapest' },
                { id: 'available' as const, label: 'Most Spots' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, sortBy: item.id }))}
                  className={`rounded-xl p-2.5 text-xs font-bold text-center transition-all ${
                    draft.sortBy === item.id
                      ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                      : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-border-strong)] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities & Features Checklist */}
          <div className="border-t border-[var(--pm-color-border)] pt-5">
            <p className="text-sm font-bold text-[var(--pm-color-text)] mb-3">Amenities & Facilities</p>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, coveredOnly: !prev.coveredOnly }))}
                className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition-all ${
                  draft.coveredOnly
                    ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:text-white hover:bg-[var(--pm-color-border-strong)]'
                }`}
              >
                <Warehouse className="h-4 w-4 shrink-0" />
                <span className="flex-1">Covered Parking</span>
                {draft.coveredOnly && <Check className="h-4 w-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, evOnly: !prev.evOnly }))}
                className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition-all ${
                  draft.evOnly
                    ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:text-white hover:bg-[var(--pm-color-border-strong)]'
                }`}
              >
                <Zap className="h-4 w-4 shrink-0" />
                <span className="flex-1">EV Charging</span>
                {draft.evOnly && <Check className="h-4 w-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, cctvOnly: !prev.cctvOnly }))}
                className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition-all ${
                  draft.cctvOnly
                    ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:text-white hover:bg-[var(--pm-color-border-strong)]'
                }`}
              >
                <Video className="h-4 w-4 shrink-0" />
                <span className="flex-1">24/7 CCTV</span>
                {draft.cctvOnly && <Check className="h-4 w-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, securityOnly: !prev.securityOnly }))}
                className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition-all ${
                  draft.securityOnly
                    ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] hover:text-white hover:bg-[var(--pm-color-border-strong)]'
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="flex-1">Security Guard</span>
                {draft.securityOnly && <Check className="h-4 w-4 stroke-[3]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--pm-color-border)] px-6 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--pm-color-muted)] hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex min-h-11 items-center justify-center rounded-xl bg-[var(--pm-color-text)] px-6 text-sm font-bold text-[var(--pm-color-page)] shadow-lg shadow-black/40 hover:bg-[var(--pm-color-muted)] active:scale-95 transition-all"
          >
            Show {totalMatchingCount} Spot{totalMatchingCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
