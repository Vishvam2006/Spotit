import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

export interface PolledResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  manualRefresh: () => Promise<void>;
}

/**
 * Loads `fetcher` once, then re-runs it every `intervalMs` in the background.
 *
 * `fetcher` must be stable for a given set of parameters (wrap it in
 * `useCallback`); a new identity triggers an immediate reload. Responses are
 * tagged with a sequence number so a slow request for stale parameters can
 * never overwrite a newer result.
 */
export function usePolledResource<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): PolledResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    const isCurrent = () => mountedRef.current && seq === seqRef.current;

    try {
      const next = await fetcherRef.current();
      if (!isCurrent()) return;
      setData(next);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (isCurrent()) setError(getErrorMessage(err));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // `load` is stable; a new `fetcher` identity means the parameters changed,
    // so publish it to the ref (which the interval also reads) and reload.
    fetcherRef.current = fetcher;
    void load();
  }, [fetcher, load]);

  useEffect(() => {
    const timer = setInterval(() => {
      void load();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  const manualRefresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  return { data, loading, error, lastUpdated, manualRefresh };
}
