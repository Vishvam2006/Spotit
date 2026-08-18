import { useCallback } from 'react';
import { fetchAdminComplaints } from '../services/admin';
import type { ComplaintStatus } from '../types/complaint';
import { usePolledResource } from './usePolledResource';

export interface UseAdminComplaintsOptions {
  page: number;
  limit: number;
  status?: string;
}

export function useAdminComplaints(
  options: UseAdminComplaintsOptions,
  intervalMs = 15_000,
) {
  const { page, limit, status } = options;

  const fetcher = useCallback(
    () =>
      fetchAdminComplaints({
        page,
        limit,
        status: (status || undefined) as ComplaintStatus | undefined,
      }),
    [page, limit, status],
  );

  const { data, loading, error, manualRefresh } = usePolledResource(
    fetcher,
    intervalMs,
  );

  return { result: data, loading, error, manualRefresh };
}
