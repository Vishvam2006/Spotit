export type AvailabilityFilter = 'all' | 'available' | 'limited' | 'full';
export type SortOption = 'price-asc' | 'price-desc' | 'name';

interface ParkingFiltersProps {
  search: string;
  availability: AvailabilityFilter;
  sort: SortOption;
  onSearchChange: (value: string) => void;
  onAvailabilityChange: (value: AvailabilityFilter) => void;
  onSortChange: (value: SortOption) => void;
}

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function ParkingFilters({
  search,
  availability,
  sort,
  onSearchChange,
  onAvailabilityChange,
  onSortChange,
}: ParkingFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label htmlFor="search" className="sr-only">
          Search by name or city
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or city…"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="availability" className="sr-only">
          Filter by availability
        </label>
        <select
          id="availability"
          value={availability}
          onChange={(event) =>
            onAvailabilityChange(event.target.value as AvailabilityFilter)
          }
          className={inputClasses}
        >
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="limited">Limited spaces</option>
          <option value="full">Full</option>
        </select>
      </div>

      <div>
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className={inputClasses}
        >
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name: A to Z</option>
        </select>
      </div>
    </div>
  );
}
