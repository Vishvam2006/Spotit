import type { BookingStatus } from '../../types/admin';
import { bookingStatusLabel } from '../../utils/adminStatus';

const STYLES: Record<BookingStatus, string> = {
  RESERVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  DISPUTED: 'bg-amber-100 text-amber-800',
};

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {bookingStatusLabel(status)}
    </span>
  );
}