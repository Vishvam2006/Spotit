import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { fetchLotReliability } from '../../services/continuity';
import { getConfidenceCopy, getEventLabel } from '../../utils/continuity';
import { formatDateTime } from '../../utils/format';
import type { LotReliability } from '../../types/continuity';

interface LotReliabilityPanelProps {
  parkingLotId: string;
}

/**
 * Shows why a lot sits where it does: the open-report count, the confidence it
 * produces, and the ledger entries behind it. An admin deciding a case needs
 * the pattern, not just the single report in front of them.
 */
export default function LotReliabilityPanel({ parkingLotId }: LotReliabilityPanelProps) {
  const [reliability, setReliability] = useState<LotReliability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchLotReliability(parkingLotId)
      .then((data) => {
        if (active) setReliability(data);
      })
      .catch(() => {
        if (active) setReliability(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [parkingLotId]);

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl bg-[var(--pm-color-surface)] py-8 shadow-sm ring-1 ring-[var(--pm-color-border)]">
        <Spinner className="h-6 w-6 text-emerald-600" />
      </div>
    );
  }

  if (!reliability) return null;

  const confidence = getConfidenceCopy(reliability.availabilityConfidence);

  return (
    <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-[var(--pm-color-action)]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
          Lot reliability
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${confidence.styles}`}
        >
          {confidence.label}
        </span>
        <span className="rounded-full bg-[var(--pm-color-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--pm-color-muted)]">
          Status: {reliability.status.replace('_', ' ')}
        </span>
      </div>

      <p className="mt-2 text-sm text-[var(--pm-color-muted)]">
        {confidence.description}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-[var(--pm-color-surface-raised)] p-3">
          <dt className="text-xs text-[var(--pm-color-muted)]">Open serious</dt>
          <dd className="mt-0.5 text-lg font-bold text-[var(--pm-color-text)]">
            {reliability.openSeriousReports}
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--pm-color-surface-raised)] p-3">
          <dt className="text-xs text-[var(--pm-color-muted)]">Open total</dt>
          <dd className="mt-0.5 text-lg font-bold text-[var(--pm-color-text)]">
            {reliability.openReports}
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--pm-color-surface-raised)] p-3">
          <dt className="text-xs text-[var(--pm-color-muted)]">All time</dt>
          <dd className="mt-0.5 text-lg font-bold text-[var(--pm-color-text)]">
            {reliability.totalReports}
          </dd>
        </div>
      </dl>

      {reliability.underReviewSince && (
        <p className="mt-3 text-xs text-[var(--pm-color-muted)]">
          Under review since {formatDateTime(reliability.underReviewSince)}
        </p>
      )}

      {reliability.timeline.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
            Recent activity
          </h4>
          <ul className="mt-2 space-y-1.5">
            {reliability.timeline.slice(0, 8).map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"
              >
                <span className="text-[var(--pm-color-text)]">
                  {getEventLabel(event.type)}
                </span>
                <span className="text-xs text-[var(--pm-color-muted)]">
                  {formatDateTime(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
