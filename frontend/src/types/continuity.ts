import type { BookingStatus } from './booking';
import type { Complaint } from './complaint';

/** The concrete ways a lot can fail a user, mirroring the backend enum. */
export type IssueType =
  | 'SPACE_UNAVAILABLE'
  | 'LOT_FULL'
  | 'LOT_CLOSED'
  | 'MISLEADING_LISTING'
  | 'ACCESS_BLOCKED'
  | 'OTHER';

export type IssueSeverity = 'MINOR' | 'SERIOUS';

export type AvailabilityConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNDER_REVIEW';

export type ContinuityEventType =
  | 'BOOKING_CREATED'
  | 'CAPACITY_HELD'
  | 'CAPACITY_RELEASED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_DISPUTED'
  | 'ISSUE_REPORTED'
  | 'REPORT_STATUS_CHANGED'
  | 'LOT_CONFIDENCE_CHANGED'
  | 'LOT_UNDER_REVIEW'
  | 'LOT_REINSTATED'
  | 'LOT_DEACTIVATED';

export interface ContinuityEvent {
  id: string;
  type: ContinuityEventType;
  bookingId: string | null;
  parkingLotId: string | null;
  complaintId: string | null;
  actorId: string | null;
  actorRole: 'USER' | 'OWNER' | 'ADMIN' | null;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** What the engine did in response to a report. */
export interface ReportIssueResult {
  report: Complaint;
  bookingStatus: BookingStatus;
  bookingProtected: boolean;
  lotUnderReview: boolean;
  openSeriousReports: number;
}

export interface LotReliability {
  parkingLotId: string;
  status: string;
  availabilityConfidence: AvailabilityConfidence;
  openSeriousReports: number;
  openReports: number;
  totalReports: number;
  underReviewSince: string | null;
  timeline: ContinuityEvent[];
}
