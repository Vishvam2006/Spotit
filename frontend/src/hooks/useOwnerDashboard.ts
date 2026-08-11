import { useCallback, useEffect, useState } from 'react';
import {
  fetchOwnerAnalytics,
  fetchOwnerBookings,
  fetchOwnerDashboard,
  fetchOwnerParkingStatus,
  fetchOwnerParkings,
  fetchOwnerRevenue,
} from '../services/owner';
import { getErrorMessage } from '../services/api';
import type {
  OwnerDashboardData,
  OwnerParkingStatus,
} from '../types/owner';

const DEFAULT_DATA: OwnerDashboardData = {
  dashboard: null,
  parkings: [],
  revenue: null,
  bookings: [],
  analytics: null,
};

async function loadAll(): Promise<OwnerDashboardData> {
  const [dashboard, parkings, revenue, bookings, analytics] = await Promise.all([
    fetchOwnerDashboard(),
    fetchOwnerParkings(),
    fetchOwnerRevenue(),
    fetchOwnerBookings(15),
    fetchOwnerAnalytics(),
  ]);
  return { dashboard, parkings, revenue, bookings, analytics };
}

export function useOwnerDashboard(intervalMs = 10_000) {
  const [data, setData] = useState<OwnerDashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statuses, setStatuses] = useState<Record<string, OwnerParkingStatus>>({});
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const applyResult = useCallback((result: OwnerDashboardData) => {
    setData(result);
    setError(null);
    setLastUpdated(new Date());
  }, []);

  const load = useCallback(async () => {
    try {
      applyResult(await loadAll());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applyResult]);

  const loadStatuses = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) => fetchOwnerParkingStatus(id)),
    );
    const additions: Record<string, OwnerParkingStatus> = {};
    results.forEach((result, index) => {
      const id = ids[index];
      if (result.status === 'fulfilled') {
        additions[id] = result.value;
      }
    });
    setStatuses((current) => ({ ...current, ...additions }));
  }, []);

  useEffect(() => {
    let active = true;
    loadAll()
      .then((result) => {
        if (active) applyResult(result);
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
  }, [applyResult]);

  useEffect(() => {
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  useEffect(() => {
    if (expandedIds.length === 0) return;
    const timer = setInterval(() => {
      loadStatuses(expandedIds);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [loadStatuses, intervalMs, expandedIds]);

  const toggleParking = useCallback(
    (id: string) => {
      setExpandedIds((current) => {
        const open = current.includes(id);
        const next = open ? current.filter((item) => item !== id) : [...current, id];
        if (!open) {
          loadStatuses([id]);
        }
        return next;
      });
    },
    [loadStatuses],
  );

  const manualRefresh = useCallback(async () => {
    setLoading(true);
    await load();
    await loadStatuses(expandedIds);
    setLoading(false);
  }, [load, loadStatuses, expandedIds]);

  return {
    data,
    statuses,
    expandedIds,
    loading,
    error,
    lastUpdated,
    toggleParking,
    manualRefresh,
  };
}