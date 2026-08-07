import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';

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
  'h-12 w-full appearance-none rounded-2xl border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#0F172A] shadow-sm outline-none transition-all duration-200 placeholder:text-[#64748B] focus:border-[#19C7B2] focus:ring-4 focus:ring-teal-100';

export default function ParkingFilters({
  search,
  availability,
  sort,
  onSearchChange,
  onAvailabilityChange,
  onSortChange,
}: ParkingFiltersProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(260px,1fr)_180px_190px]">
      <div className="relative">
        <label htmlFor="search" className="sr-only">
          Search by name or city
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
        <input
          id="search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search destination or parking"
          className={`${inputClasses} pl-12`}
        />
      </div>

      <div className="relative">
        <label htmlFor="availability" className="sr-only">
          Filter by availability
        </label>
        <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
        <select
          id="availability"
          value={availability}
          onChange={(event) =>
            onAvailabilityChange(event.target.value as AvailabilityFilter)
          }
          className={`${inputClasses} pl-12`}
        >
          <option value="all">All spaces</option>
          <option value="available">Available</option>
          <option value="limited">Limited</option>
          <option value="full">Full</option>
        </select>
      </div>

      <div className="relative">
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className={`${inputClasses} pl-12`}
        >
          <option value="price-asc">Lowest price</option>
          <option value="price-desc">Highest price</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
}
