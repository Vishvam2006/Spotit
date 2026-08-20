import type {
  AvailabilityConfidence,
  ContinuityEventType,
  IssueType,
} from '../types/continuity';

/**
 * The issue list a user picks from. Order matters: the most common real-world
 * failure ("my bay was taken") sits first so the tap that matters is closest.
 */
export const ISSUE_OPTIONS: {
  value: IssueType;
  label: string;
  hint: string;
}[] = [
  {
    value: 'SPACE_UNAVAILABLE',
    label: 'My reserved space was taken',
    hint: 'Another vehicle was parked in the bay held for you.',
  },
  {
    value: 'LOT_FULL',
    label: 'The parking lot was full',
    hint: 'No space was free even though the listing showed availability.',
  },
  {
    value: 'LOT_CLOSED',
    label: 'The parking lot was closed',
    hint: 'Gates shut, or the lot was not operating at all.',
  },
  {
    value: 'ACCESS_BLOCKED',
    label: 'I could not get in',
    hint: 'Entry blocked, no attendant, or access was refused.',
  },
  {
    value: 'MISLEADING_LISTING',
    label: 'The listing was wrong',
    hint: 'Location, price or photos did not match the real place.',
  },
  {
    value: 'OTHER',
    label: 'Something else',
    hint: 'Anything that does not fit the options above.',
  },
];

/** Issues that freeze the booking and count against the lot. */
const SERIOUS_ISSUES: IssueType[] = [
  'SPACE_UNAVAILABLE',
  'LOT_FULL',
  'LOT_CLOSED',
  'MISLEADING_LISTING',
  'ACCESS_BLOCKED',
];

export function isSeriousIssue(issueType: IssueType): boolean {
  return SERIOUS_ISSUES.includes(issueType);
}

export function getIssueLabel(issueType: IssueType | null | undefined): string {
  if (!issueType) return 'General complaint';
  return ISSUE_OPTIONS.find((option) => option.value === issueType)?.label ?? issueType;
}

/**
 * How the confidence score is worded for users. Deliberately says what it is
 * derived from -- bookings and reports -- and never claims live verification,
 * because there is no sensor or operator feed behind it.
 */
export const CONFIDENCE_BASIS = 'Based on recent bookings and reported issues.';

const CONFIDENCE_COPY: Record<
  AvailabilityConfidence,
  { label: string; description: string; styles: string }
> = {
  HIGH: {
    label: 'Availability confidence: High',
    description: `No open reports contradict this listing. ${CONFIDENCE_BASIS}`,
    styles: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  },
  MEDIUM: {
    label: 'Availability confidence: Medium',
    description: `One driver was recently turned away here. ${CONFIDENCE_BASIS}`,
    styles: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  },
  LOW: {
    label: 'Availability confidence: Low',
    description: `Several drivers were recently turned away here. ${CONFIDENCE_BASIS}`,
    styles: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  },
  UNDER_REVIEW: {
    label: 'This parking lot is under review',
    description: `Bookings are paused while an admin checks the reports against it. ${CONFIDENCE_BASIS}`,
    styles: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  },
};

export function getConfidenceCopy(confidence: AvailabilityConfidence) {
  return CONFIDENCE_COPY[confidence];
}

/** Plain-language description of each ledger entry, for the booking timeline. */
const EVENT_COPY: Record<ContinuityEventType, string> = {
  BOOKING_CREATED: 'Booking created',
  CAPACITY_HELD: 'A space was locked for you',
  CAPACITY_RELEASED: 'The space was released back to the lot',
  CHECKED_IN: 'You checked in',
  CHECKED_OUT: 'You checked out',
  BOOKING_CANCELLED: 'Booking cancelled',
  BOOKING_EXPIRED: 'Booking expired without a check-in',
  BOOKING_DISPUTED: 'Booking protected as evidence',
  ISSUE_REPORTED: 'You reported an issue',
  REPORT_STATUS_CHANGED: 'Your report was updated',
  LOT_CONFIDENCE_CHANGED: 'Lot reliability updated',
  LOT_UNDER_REVIEW: 'Parking lot placed under review',
  LOT_REINSTATED: 'Parking lot cleared and reinstated',
  LOT_DEACTIVATED: 'Parking lot deactivated by its owner',
};

export function getEventLabel(type: ContinuityEventType): string {
  return EVENT_COPY[type] ?? type;
}

export const MAX_EVIDENCE_PHOTOS = 5;
export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
