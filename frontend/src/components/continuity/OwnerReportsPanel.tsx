import { useCallback, useEffect, useState } from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { fetchOwnerReports, resolveReport } from '../../services/continuity';
import { getErrorMessage } from '../../services/api';
import { notifySuccess } from '../../utils/notify';
import { getIssueLabel } from '../../utils/continuity';
import { formatDateTime } from '../../utils/format';
import type { Complaint } from '../../types/complaint';

/**
 * The owner's half of the accountability loop: issues users hit at their lots,
 * newest and most serious first, with a way to acknowledge each one.
 *
 * Owners can move a report to IN_REVIEW but cannot close it — only an admin
 * can mark it RESOLVED, because closing a report is what restores a lot's
 * reliability score, and the owner is the interested party.
 */
export default function OwnerReportsPanel() {
  const [reports, setReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;

    fetchOwnerReports({ limit: 20 })
      .then((result) => {
        if (active) {
          setReports(result.items);
          setError(null);
        }
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

  useEffect(() => load(), [load]);

  async function acknowledge(report: Complaint) {
    setUpdatingId(report.id);
    try {
      await resolveReport(report.id, { status: 'IN_REVIEW' });
      notifySuccess('Report acknowledged. Our team can see you are on it.');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)] sm:p-6">
      <div className="flex items-center gap-2">
        <Inbox className="h-5 w-5 text-[var(--pm-color-action)]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
          Issues reported at your lots
        </h3>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error" message={error} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6 text-emerald-600" />
        </div>
      ) : reports.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--pm-color-muted)]">
          No issues reported. Keeping your space counts accurate is what keeps it
          that way.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-xl border border-[var(--pm-color-border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--pm-color-text)]">
                      {getIssueLabel(report.issueType)}
                    </p>
                    {report.severity === 'SERIOUS' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        Serious
                      </span>
                    )}
                    <span className="rounded-full bg-[var(--pm-color-surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-[var(--pm-color-muted)]">
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
                    {report.parkingLot?.name} · {formatDateTime(report.createdAt)}
                  </p>
                </div>

                {report.status === 'PENDING' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    loading={updatingId === report.id}
                    onClick={() => acknowledge(report)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-[var(--pm-color-text)]">
                {report.description}
              </p>

              {report.photos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {report.photos.map((url, index) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="h-16 w-16 rounded-lg object-cover ring-1 ring-[var(--pm-color-border)] transition-opacity hover:opacity-90"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
