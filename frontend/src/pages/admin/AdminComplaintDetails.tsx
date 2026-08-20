import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  User,
  SquareParking,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import ComplaintStatusBadge from '../../components/admin/ComplaintStatusBadge';
import { complaintStatusLabel } from '../../utils/adminStatus';
import {
  fetchAdminComplaint,
  updateAdminComplaintStatus,
} from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { notifySuccess } from '../../utils/notify';
import { formatDateTime } from '../../utils/format';
import { getIssueLabel } from '../../utils/continuity';
import LotReliabilityPanel from '../../components/continuity/LotReliabilityPanel';
import BookingTimeline from '../../components/continuity/BookingTimeline';
import ConfidenceBadge from '../../components/continuity/ConfidenceBadge';
import type { Complaint, ComplaintStatus } from '../../types/complaint';

const STATUS_OPTIONS: ComplaintStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
];

export default function AdminComplaintDetails() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    fetchAdminComplaint(id)
      .then((data) => {
        if (!active) return;
        setComplaint(data);
        setError(null);
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
  }, [id]);

  async function handleStatusChange(next: ComplaintStatus) {
    if (!id) return;
    setUpdating(true);
    try {
      const updated = await updateAdminComplaintStatus(id, next);
      setComplaint(updated);
      notifySuccess('Complaint status updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error" message={error} />;
  }

  if (!complaint) {
    return <Alert variant="error" message="Complaint not found." />;
  }

  return (
    <section className="space-y-4">
      <Link
        to="/admin/complaints"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to complaints
      </Link>

      <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--pm-color-text)]">
                {complaint.subject}
              </h2>
              <ComplaintStatusBadge status={complaint.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
              {getIssueLabel(complaint.issueType)} · Submitted{' '}
              {formatDateTime(complaint.createdAt)}
            </p>
            {complaint.severity === 'SERIOUS' && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Serious — counts against this lot's reliability
              </span>
            )}
          </div>
          <div className="w-full sm:w-56">
            <label
              htmlFor="detail-status"
              className="block text-xs font-semibold text-[var(--pm-color-muted)]"
            >
              Update status
            </label>
            <select
              id="detail-status"
              value={complaint.status}
              disabled={updating}
              onChange={(event) =>
                handleStatusChange(event.target.value as ComplaintStatus)
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-sm text-[var(--pm-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {complaintStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-[var(--pm-color-surface-raised)] p-4">
          <p className="text-sm leading-6 text-[var(--pm-color-text)]">
            {complaint.description}
          </p>
        </div>

        {complaint.photos.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
              Photo evidence
            </h3>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {complaint.photos.map((url, index) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Evidence ${index + 1}`}
                      className="aspect-square w-full rounded-lg object-cover ring-1 ring-[var(--pm-color-border)] transition-opacity hover:opacity-90"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {complaint.resolutionNote && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <p className="font-semibold">Resolution</p>
            <p className="mt-1">{complaint.resolutionNote}</p>
          </div>
        )}

        {complaint.resolvedAt && (
          <p className="mt-3 text-xs text-[var(--pm-color-muted)]">
            Resolved on {formatDateTime(complaint.resolvedAt)}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--pm-color-action)]" />
            <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
              Reporter
            </h3>
          </div>
          <p className="mt-3 font-semibold text-[var(--pm-color-text)]">
            {complaint.user?.fullName ?? 'Unknown user'}
          </p>
          <p className="text-sm text-[var(--pm-color-muted)]">
            {complaint.user?.email ?? '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
          <div className="flex items-center gap-2">
            <SquareParking className="h-5 w-5 text-[var(--pm-color-action)]" />
            <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
              Parking
            </h3>
          </div>
          {complaint.parkingLot ? (
            <>
              <p className="mt-3 font-semibold text-[var(--pm-color-text)]">
                {complaint.parkingLot.name}
              </p>
              <p className="text-sm text-[var(--pm-color-muted)]">
                {complaint.parkingLot.address}, {complaint.parkingLot.city}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
                Lot status
              </p>
              <p className="text-sm font-semibold text-[var(--pm-color-text)]">
                {complaint.parkingLot.status.replace('_', ' ')}
              </p>
              <ConfidenceBadge
                confidence={complaint.parkingLot.availabilityConfidence}
                size="sm"
                withBasis
                className="mt-3"
              />
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--pm-color-muted)]">
              Not associated with a parking lot.
            </p>
          )}
        </div>

        {complaint.parkingLot && (
          <div className="sm:col-span-2">
            <LotReliabilityPanel parkingLotId={complaint.parkingLot.id} />
          </div>
        )}

        {complaint.booking && (
          <div className="rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)] sm:col-span-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[var(--pm-color-action)]" />
              <h3 className="text-sm font-bold text-[var(--pm-color-text)]">
                Related booking
              </h3>
            </div>
            <p className="mt-3 font-mono text-sm text-[var(--pm-color-text)]">
              {complaint.booking.id}
            </p>
            <p className="text-sm text-[var(--pm-color-muted)]">
              Status: {complaint.booking.status} · Reserved{' '}
              {formatDateTime(complaint.booking.reservedAt)}
            </p>

            {/* The ledger for this exact booking. It is what shows an admin the
                report is attached to a real reservation rather than loose
                feedback, and in what order the engine acted. */}
            <div className="mt-5">
              <BookingTimeline bookingId={complaint.booking.id} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            type="button"
            variant={status === complaint.status ? 'primary' : 'secondary'}
            size="sm"
            fullWidth={false}
            disabled={updating || status === complaint.status}
            onClick={() => handleStatusChange(status)}
          >
            {complaintStatusLabel(status)}
          </Button>
        ))}
      </div>
    </section>
  );
}