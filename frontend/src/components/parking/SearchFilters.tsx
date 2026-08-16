import { useEffect, useState } from 'react';
import Input from '../ui/Input';
import type { ParkingFilters, ParkingSort } from '../../types/parking';

interface SearchFiltersProps {
  filters: ParkingFilters;
  cities: string[];
  onChange: (patch: Partial<ParkingFilters>) => void;
  onClear: () => void;
}

const SORT_OPTIONS: { value: ParkingSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'expensive', label: 'Most Expensive' },
  { value: 'nearest', label: 'Nearest' },
];

const DEBOUNCE_DELAY_MS = 400;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

const selectClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500';

export default function SearchFilters({
  filters,
  cities,
  onChange,
  onClear,
}: SearchFiltersProps) {
  const [searchText, setSearchText] = useState(filters.q ?? '');
  const [priceText, setPriceText] = useState(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : '',
  );

  const debouncedSearchText = useDebouncedValue(searchText, DEBOUNCE_DELAY_MS);
  const debouncedPriceText = useDebouncedValue(priceText, DEBOUNCE_DELAY_MS);

  useEffect(() => {
    const q = debouncedSearchText.trim() || undefined;
    if (q !== filters.q) {
      onChange({ q });
    }
  }, [debouncedSearchText, filters.q, onChange]);

  useEffect(() => {
    const parsed = Number(debouncedPriceText);
    const maxPrice =
      debouncedPriceText !== '' && Number.isFinite(parsed) && parsed > 0
        ? parsed
        : undefined;
    if (maxPrice !== filters.maxPrice) {
      onChange({ maxPrice });
    }
  }, [debouncedPriceText, filters.maxPrice, onChange]);

  const handleSortChange = (sort: ParkingSort) => {
    onChange({ sort });
  };

  const handleClear = () => {
    setSearchText('');
    setPriceText('');
    onClear();
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <Input
            id="search-parking"
            label="Search"
            type="search"
            placeholder="Search by name or address"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="filter-city"
            className="block text-sm font-medium text-slate-700"
          >
            City
          </label>
          <select
            id="filter-city"
            value={filters.city ?? ''}
            onChange={(event) => onChange({ city: event.target.value || undefined })}
            className={selectClassName}
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Input
            id="filter-max-price"
            label="Max Price (₹/hr)"
            type="number"
            min={1}
            step="0.01"
            placeholder="Any"
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
          />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={filters.availableOnly ?? false}
              onChange={(event) =>
                onChange({ availableOnly: event.target.checked || undefined })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Available only
          </label>
        </div>

        <div>
          <label
            htmlFor="filter-sort"
            className="block text-sm font-medium text-slate-700"
          >
            Sort
          </label>
          <select
            id="filter-sort"
            value={filters.sort ?? 'newest'}
            onChange={(event) => handleSortChange(event.target.value as ParkingSort)}
            className={selectClassName}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end lg:col-span-6 lg:justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
