import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  MapPin,
  Navigation,
  Warehouse,
  Compass,
  Loader2,
  Building,
  MapPinned,
} from 'lucide-react';
import type { LatLng } from '../../utils/geolocation';
import type { ParkingLot } from '../../types/parking';
import { formatDistanceKm } from '../../utils/distance';
import { searchPlaceSuggestions, type PlaceSuggestion } from '../../services/places';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (suggestion: PlaceSuggestion) => void;
  onSubmitText: (query: string) => void;
  onClear: () => void;
  onUseCurrentLocation?: () => void;
  userLocation?: LatLng | null;
  parkingLots?: ParkingLot[];
  placeholder?: string;
  isSearching?: boolean;
  rightAction?: React.ReactNode;
}

const POPULAR_AREAS = [
  { name: 'Vastrapur', lat: 23.0387, lng: 72.5305, desc: 'Ahmedabad • Lake & Shopping' },
  { name: 'SG Highway', lat: 23.0272, lng: 72.5073, desc: 'Ahmedabad • Commercial Hub' },
  { name: 'Law Garden', lat: 23.0232, lng: 72.5621, desc: 'Ahmedabad • Night Market' },
  { name: 'Sabarmati Riverfront', lat: 23.0225, lng: 72.5766, desc: 'Ahmedabad • Riverfront Promenade' },
  { name: 'Sindhu Bhavan', lat: 23.0452, lng: 72.5032, desc: 'Ahmedabad • Cafes & Dining' },
  { name: 'Kalupur Railway Station', lat: 23.0272, lng: 72.6008, desc: 'Ahmedabad • Central Station' },
];

export default function SearchAutocomplete({
  value,
  onChange,
  onSelectPlace,
  onSubmitText,
  onClear,
  onUseCurrentLocation,
  userLocation,
  parkingLots = [],
  placeholder = 'Search destination, area, or parking...',
  isSearching = false,
  rightAction,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search for suggestions
  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchPlaceSuggestions(query, userLocation, parkingLots, controller.signal)
        .then((items) => {
          setSuggestions(items);
          setSelectedIndex(-1);
        })
        .catch(() => {
          // Ignore fetch error
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, userLocation, parkingLots]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = useCallback(
    (item: PlaceSuggestion) => {
      setIsOpen(false);
      setSelectedIndex(-1);
      onSelectPlace(item);
    },
    [onSelectPlace],
  );

  const handlePopularAreaSelect = useCallback(
    (area: typeof POPULAR_AREAS[0]) => {
      setIsOpen(false);
      onSelectPlace({
        id: `popular-${area.name}`,
        title: area.name,
        subtitle: area.desc,
        location: { lat: area.lat, lng: area.lng },
        type: 'locality',
      });
    },
    [onSelectPlace],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (value.trim()) {
        setIsOpen(false);
        onSubmitText(value.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getIconForType = (type: PlaceSuggestion['type']) => {
    switch (type) {
      case 'parking':
        return (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
            <Warehouse className="h-4 w-4" />
          </span>
        );
      case 'landmark':
        return (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
            <Building className="h-4 w-4" />
          </span>
        );
      case 'street':
        return (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30">
            <Navigation className="h-4 w-4" />
          </span>
        );
      default:
        return (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#252530] text-slate-300 ring-1 ring-white/10">
            <MapPin className="h-4 w-4 text-emerald-400" />
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Floating Pill */}
      <div className="flex items-center gap-2.5 rounded-full border border-[#272732] bg-[#121216]/95 px-3.5 py-2.5 shadow-2xl shadow-black/90 backdrop-blur-2xl transition-all focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20">
        {/* Left Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300">
          <MapPin className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
        </div>

        {/* Input */}
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-neutral-400 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-[#202028] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (value.trim()) {
                setIsOpen(false);
                onSubmitText(value.trim());
              }
            }}
            disabled={isSearching || loading}
            aria-label="Search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-[#202028] hover:text-white transition-colors disabled:opacity-50"
          >
            {loading || isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>

          {rightAction}
        </div>
      </div>

      {/* Google Maps Style Autocomplete Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[70vh] overflow-y-auto rounded-3xl border border-[#272732] bg-[#141419]/98 p-2 shadow-2xl shadow-black/95 backdrop-blur-2xl pm-scrollbar-none animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Quick Action: Current Location */}
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onUseCurrentLocation();
              }}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-[#20202b] focus:bg-[#20202b] focus:outline-none"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30">
                <Compass className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sky-300">Your Current Location</p>
                <p className="text-xs text-neutral-400">Center map and search nearby parking</p>
              </div>
            </button>
          )}

          {/* If search query has suggestions */}
          {suggestions.length > 0 ? (
            <div className="mt-1 space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Suggestions
              </div>
              {suggestions.map((item, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40 text-white'
                        : 'hover:bg-[#20202b] text-neutral-200'
                    }`}
                  >
                    {getIconForType(item.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-white">
                          {item.title}
                        </p>
                        {item.distanceKm !== undefined && (
                          <span className="shrink-0 text-xs font-semibold text-emerald-400">
                            {formatDistanceKm(item.distanceKm)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-400 mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : value.trim() && !loading ? (
            <div className="px-4 py-6 text-center">
              <MapPinned className="mx-auto h-8 w-8 text-neutral-500 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-neutral-300">
                No direct matches found for "{value}"
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Press Enter to search global map geocoder
              </p>
            </div>
          ) : null}

          {/* Popular Destinations when query is empty */}
          {!value.trim() && (
            <div className="mt-2 border-t border-[#272732] pt-2">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Popular in Ahmedabad
              </div>
              <div className="mt-1 space-y-1">
                {POPULAR_AREAS.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handlePopularAreaSelect(area)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-[#20202b]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202028] text-slate-300">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{area.name}</p>
                      <p className="text-xs text-neutral-400 truncate">{area.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
