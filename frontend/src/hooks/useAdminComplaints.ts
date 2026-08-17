import { useCallback, useEffect, useState } from 'react';
import { fetchAdminComplaints } from '../services/admin';
import { getErrorMessage } from '../services/api';
import type { ComplaintStatus } from '../types/complaint';
import type { Complaint } from '../types/complaint';
import type { Paginated } from '../types/admin';

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
  const [result, setResult] = useState<Paginated<Complaint> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchAdminComplaints({
        page,
        limit,
        status: status as ComplaintStatus | undefined,
      });
      setResult(next);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => {
    let active = true;
    fetchAdminComplaints({
      page,
      limit,
      status: status as ComplaintStatus | undefined,
    })
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
  }, [page, limit, status]);

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