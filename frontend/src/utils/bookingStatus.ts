import type { BookingStatus } from '../types/booking';

const statusStyles: Record<BookingStatus, string> = {
  RESERVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  DISPUTED: 'bg-amber-100 text-amber-800',
};

/** Short, plain-language label shown next to the raw status. */
const statusLabels: Record<BookingStatus, string> = {
  RESERVED: 'Reserved',
  ACTIVE: 'Parked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DISPUTED: 'Under review',
};

export function getBookingStatusLabel(status: BookingStatus): string {
  return statusLabels[status];
}

export function getBookingStatusStyles(status: BookingStatus): string {
  return statusStyles[status];
}
