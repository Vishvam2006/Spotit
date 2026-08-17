import type { ComplaintStatus } from '../../types/complaint';
import { complaintStatusLabel } from '../../utils/adminStatus';

const STYLES: Record<ComplaintStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  IN_REVIEW: 'bg-sky-50 text-sky-700 ring-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
};

export default function ComplaintStatusBadge({
  status,
}: {
  status: ComplaintStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STYLES[status]}`}
    >
      {complaintStatusLabel(status)}
    </span>
  );
}