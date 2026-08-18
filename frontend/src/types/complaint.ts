import type { IssueSeverity, IssueType } from './continuity';

export type ComplaintStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface ComplaintUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface ComplaintParking {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface ComplaintBooking {
  id: string;
  status: string;
  reservedAt: string;
}

export interface Complaint {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  /** Continuity Engine fields; null on free-form complaints raised outside a booking. */
  issueType: IssueType | null;
  severity: IssueSeverity;
  photos: string[];
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: ComplaintUser;
  parkingLot?: ComplaintParking | null;
  booking?: ComplaintBooking | null;
}