import { fetchAdminDashboard } from '../services/admin';
import { usePolledResource } from './usePolledResource';

export function useAdminDashboard(intervalMs = 10_000) {
  return usePolledResource(fetchAdminDashboard, intervalMs);
}
