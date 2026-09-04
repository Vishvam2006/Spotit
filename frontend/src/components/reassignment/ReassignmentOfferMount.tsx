import { useCallback } from 'react';
import { useAuth } from '../../context/auth-context';
import { usePolledResource } from '../../hooks/usePolledResource';
import { fetchPendingReassignment } from '../../services/reassignment';
import ReassignmentOfferModal from './ReassignmentOfferModal';

// Shorter than the Bookings page's own 30s poll -- this is a 5-minute-boxed
// decision, so the popup should surface (and disappear once resolved) fast.
const POLL_INTERVAL_MS = 15_000;

/**
 * Mounted once at the app root (sibling to <Routes>) so a pending
 * auto-reassignment offer can interrupt the user on any screen, not just the
 * Bookings page -- there is no websocket/push in this app, so this polls.
 */
export default function ReassignmentOfferMount() {
  const { user } = useAuth();

  const fetcher = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return fetchPendingReassignment();
  }, [user]);

  const { data, manualRefresh } = usePolledResource(fetcher, POLL_INTERVAL_MS);

  if (!user || !data) {
    return null;
  }

  return (
    <ReassignmentOfferModal key={data.id} offer={data} onResolved={() => void manualRefresh()} />
  );
}
