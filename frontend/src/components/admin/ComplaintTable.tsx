import ComplaintStatusBadge from './ComplaintStatusBadge';
import { complaintStatusLabel } from '../../utils/adminStatus';
import { formatDateTime } from '../../utils/format';
import type { Complaint, ComplaintStatus } from '../../types/complaint';

interface ComplaintTableProps {
  complaints: Complaint[];
  loading?: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: ComplaintStatus) => void;
  updatingId?: string | null;
}

const STATUS_OPTIONS: ComplaintStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
];

export default function ComplaintTable({
  complaints,
  loading,
  onSelect,
  onStatusChange,
  updatingId,
}: ComplaintTableProps) {
  if (loading && complaints.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl bg-[var(--pm-color-surface)] p-5 shadow-sm ring-1 ring-[var(--pm-color-border)]">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-[var(--pm-color-surface-raised)]"
          />
        ))}
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-8 text-center">
        <p className="font-semibold text-[var(--pm-color-text)]">
          No complaints
        </p>
        <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
          Complaints submitted by users will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <ul className="divide-y divide-[var(--pm-color-border)] md:hidden">
        {complaints.map((complaint) => (
          <li key={complaint.id} className="px-5 py-4">
            <button
              type="button"
              onClick={() => onSelect(complaint.id)}
              className="w-full text-left focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--pm-color-text)]">
                    {complaint.subject}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[var(--pm-color-muted)]">
                    {complaint.user?.fullName ?? 'Unknown user'}
                  </p>
                </div>
                <ComplaintStatusBadge status={complaint.status} />
              </div>
              <p className="mt-2 text-xs text-[var(--pm-color-muted)]">
                {formatDateTime(complaint.createdAt)}
              </p>
            </button>
            <div className="mt-3">
              <label className="sr-only" htmlFor={`status-${complaint.id}`}>
                Change status
              </label>
              <select
                id={`status-${complaint.id}`}
                value={complaint.status}
                disabled={updatingId === complaint.id}
                onChange={(event) =>
                  onStatusChange(
                    complaint.id,
                    event.target.value as ComplaintStatus,
                  )
                }
                className="min-h-9 rounded-lg border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-2.5 text-sm text-[var(--pm-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {complaintStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] text-xs font-semibold uppercase tracking-wide text-[var(--pm-color-muted)]">
              <th className="px-5 py-3">Complaint</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Parking</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pm-color-border)]">
            {complaints.map((complaint) => (
              <tr
                key={complaint.id}
                className="cursor-pointer hover:bg-[var(--pm-color-surface-raised)]"
                onClick={() => onSelect(complaint.id)}
              >
                <td className="max-w-56 px-5 py-3">
                  <p className="truncate font-semibold text-[var(--pm-color-text)]">
                    {complaint.subject}
                  </p>
                  <p className="truncate text-xs text-[var(--pm-color-muted)]">
                    {complaint.category}
                  </p>
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {complaint.user?.fullName ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {complaint.parkingLot?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--pm-color-muted)]">
                  {formatDateTime(complaint.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <ComplaintStatusBadge status={complaint.status} />
                </td>
                <td
                  className="px-5 py-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <label className="sr-only" htmlFor={`status-${complaint.id}`}>
                    Change status
                  </label>
                  <select
                    id={`status-${complaint.id}`}
                    value={complaint.status}
                    disabled={updatingId === complaint.id}
                    onChange={(event) =>
                      onStatusChange(
                        complaint.id,
                        event.target.value as ComplaintStatus,
                      )
                    }
                    className="min-h-9 rounded-lg border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-2.5 text-sm text-[var(--pm-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {complaintStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}