import type { BookingStatus } from '../types/admin';
import type { ComplaintStatus } from '../types/complaint';

const BOOKING_LABELS: Record<BookingStatus, string> = {
  RESERVED: 'Reserved',
  ACTIVE: 'Checked-in',
  COMPLETED: 'Checked-out',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DISPUTED: 'Disputed',
};

const COMPLAINT_LABELS: Record<ComplaintStatus, string> = {
  PENDING: 'Pending',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export function bookingStatusLabel(status: BookingStatus): string {
  return BOOKING_LABELS[status];
}

export function complaintStatusLabel(status: ComplaintStatus): string {
  return COMPLAINT_LABELS[status];
}