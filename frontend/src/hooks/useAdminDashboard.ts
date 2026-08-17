import { useCallback, useEffect, useState } from 'react';
import { fetchAdminDashboard } from '../services/admin';
import { getErrorMessage } from '../services/api';
import type { AdminDashboard } from '../types/admin';

export function useAdminDashboard(intervalMs = 10_000) {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const dashboard = await fetchAdminDashboard();
      setData(dashboard);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminDashboard()
      .then((dashboard) => {
        if (!active) return;
        setData(dashboard);
        setLastUpdated(new Date());
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
  }, []);

  useEffect(() => {
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  const manualRefresh = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  return { data, loading, error, lastUpdated, manualRefresh };
}