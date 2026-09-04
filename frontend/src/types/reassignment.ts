export interface ReassignmentCandidateLot {
  id: string;
  name: string;
  address: string;
  city: string;
  pricePerHour: number;
}

/** The current user's still-open auto-reassignment offer. */
export interface ReassignmentOffer {
  id: string;
  status: 'PENDING';
  decisionDeadline: string | null;
  distanceKm: number | null;
  candidateBookingId: string;
  estimatedAmount: number | null;
  candidateLot: ReassignmentCandidateLot;
}
