import { useCallback } from 'react';
import { fetchAdminBookings, type AdminBookingsParams } from '../services/admin';
import { usePolledResource } from './usePolledResource';

export interface UseAdminBookingsOptions {
  page: number;
  limit: number;
  status?: string;
  parkingId?: string;
  date?: string;
  search?: string;
}

export function useAdminBookings(
  options: UseAdminBookingsOptions,
  intervalMs = 10_000,
) {
  const { page, limit, status, parkingId, date, search } = options;

  const fetcher = useCallback(
    () =>
      fetchAdminBookings({
        page,
        limit,
        status: (status || undefined) as AdminBookingsParams['status'],
        parkingId: parkingId || undefined,
        date: date || undefined,
        search: search || undefined,
      }),
    [page, limit, status, parkingId, date, search],
  );

  const { data, loading, error, manualRefresh } = usePolledResource(
    fetcher,
    intervalMs,
  );

  return { result: data, loading, error, manualRefresh };
}
