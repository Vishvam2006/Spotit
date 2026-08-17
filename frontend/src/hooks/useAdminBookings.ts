import { useCallback, useEffect, useState } from 'react';
import { fetchAdminBookings, type AdminBookingsParams } from '../services/admin';
import { getErrorMessage } from '../services/api';
import type { AdminBooking, Paginated } from '../types/admin';

export interface UseAdminBookingsOptions {
  page: number;
  limit: number;
  status?: string;
  parkingId?: string;
  date?: string;
  search?: string;
}

function toParams(options: UseAdminBookingsOptions): AdminBookingsParams {
  const { page, limit, status, parkingId, date, search } = options;
  return {
    page,
    limit,
    status: (status || undefined) as AdminBookingsParams['status'],
    parkingId: parkingId || undefined,
    date: date || undefined,
    search: search || undefined,
  };
}

export function useAdminBookings(
  options: UseAdminBookingsOptions,
  intervalMs = 10_000,
) {
  const { page, limit, status, parkingId, date, search } = options;
  const [result, setResult] = useState<Paginated<AdminBooking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchAdminBookings(toParams(options));
      setResult(next);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, parkingId, date, search]);

  useEffect(() => {
    let active = true;
    fetchAdminBookings(toParams(options))
      .then((next) => {
        if (!active) return;
        setResult(next);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, parkingId, date, search]);

  useEffect(() => {
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  const manualRefresh = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  return { result, loading, error, manualRefresh };
}