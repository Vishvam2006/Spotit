import { Search } from 'lucide-react';
import type { ParkingLot } from '../../types/parking';

export interface BookingFilterValues {
  search: string;
  status: string;
  parkingId: string;
  date: string;
}

interface BookingFiltersProps {
  values: BookingFilterValues;
  parkings: ParkingLot[];
  onChange: (values: BookingFilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'ACTIVE', label: 'Checked-in' },
  { value: 'COMPLETED', label: 'Checked-out' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const selectClass =
  'min-h-11 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-sm text-[var(--pm-color-text)] shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)]';

export default function BookingFilters({
  values,
  parkings,
  onChange,
}: BookingFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl bg-[var(--pm-color-surface)] p-4 shadow-sm ring-1 ring-[var(--pm-color-border)] sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-1">
        <label
          htmlFor="booking-search"
          className="block text-xs font-semibold text-[var(--pm-color-muted)]"
        >
          Search
        </label>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pm-color-muted)]"
            aria-hidden="true"
          />
          <input
            id="booking-search"
            type="search"
            placeholder="User, vehicle, booking ID, parking"
            value={values.search}
            onChange={(event) =>
              onChange({ ...values, search: event.target.value })
            }
            className={`${selectClass} pl-9`}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="booking-status"
          className="block text-xs font-semibold text-[var(--pm-color-muted)]"
        >
          Status
        </label>
        <select
          id="booking-status"
          value={values.status}
          onChange={(event) =>
            onChange({ ...values, status: event.target.value })
          }
          className={`${selectClass} mt-1`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="booking-parking"
          className="block text-xs font-semibold text-[var(--pm-color-muted)]"
        >
          Parking
        </label>
        <select
          id="booking-parking"
          value={values.parkingId}
          onChange={(event) =>
            onChange({ ...values, parkingId: event.target.value })
          }
          className={`${selectClass} mt-1`}
        >
          <option value="">All parkings</option>
          {parkings.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="booking-date"
          className="block text-xs font-semibold text-[var(--pm-color-muted)]"
        >
          Date
        </label>
        <input
          id="booking-date"
          type="date"
          value={values.date}
          onChange={(event) => onChange({ ...values, date: event.target.value })}
          className={`${selectClass} mt-1`}
        />
      </div>
    </div>
  );
}