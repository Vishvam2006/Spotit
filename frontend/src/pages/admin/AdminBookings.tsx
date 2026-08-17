import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert';
import BookingFilters from '../../components/admin/BookingFilters';
import BookingStatusTable from '../../components/admin/BookingStatusTable';
import Pagination from '../../components/admin/Pagination';
import { useAdminBookings } from '../../hooks/useAdminBookings';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { fetchParkingLots } from '../../services/parking';
import { getErrorMessage } from '../../services/api';
import type { ParkingLot } from '../../types/parking';

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  search: '',
  status: '',
  parkingId: '',
  date: '',
};

export default function AdminBookings() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [parkings, setParkings] = useState<ParkingLot[]>([]);
  const [parkingsError, setParkingsError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 400);

  useEffect(() => {
    fetchParkingLots()
      .then(setParkings)
      .catch((err) => setParkingsError(getErrorMessage(err)));
  }, []);

  const { result, loading, error } = useAdminBookings({
    page,
    limit: PAGE_SIZE,
    status: filters.status,
    parkingId: filters.parkingId,
    date: filters.date,
    search: debouncedSearch,
  });

  function handleFilterChange(next: typeof EMPTY_FILTERS) {
    setFilters(next);
    setPage(1);
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-bold text-[var(--pm-color-text)]">
          Booking Status
        </h2>
        <p className="text-sm text-[var(--pm-color-muted)]">
          Live view of all bookings across every parking location.
        </p>
      </div>

      {parkingsError && (
        <div className="mb-4">
          <Alert variant="error" message={parkingsError} />
        </div>
      )}

      <div className="mb-4">
        <BookingFilters
          values={filters}
          parkings={parkings}
          onChange={handleFilterChange}
        />
      </div>

      <BookingStatusTable
        bookings={result?.items ?? []}
        loading={loading}
        error={error}
      />

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={result.limit}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}