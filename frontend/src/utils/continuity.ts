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
 * The standard availability confidence explanation required throughout the app.
 */
export const CONFIDENCE_BASIS =
  'Availability confidence is based on recent bookings, operator updates, and unresolved issue reports.';

export const CONFIDENCE_TOOLTIP_TEXT = CONFIDENCE_BASIS;

export interface ConfidenceDetail {
  level: AvailabilityConfidence;
  title: string;
  badgeLabel: string;
  badgeShort: string;
  description: string;
  meaning: string;
  example: string;
  styles: string;
  dotColor: string;
  indicatorBg: string;
}

export const CONFIDENCE_DETAILS: Record<AvailabilityConfidence, ConfidenceDetail> = {
  HIGH: {
    level: 'HIGH',
    title: 'High Confidence',
    badgeLabel: 'Availability confidence: High',
    badgeShort: 'High confidence',
    description: `No open reports contradict this listing. ${CONFIDENCE_BASIS}`,
    meaning: 'Frequent successful check-ins, recent verified activity, and zero open disruption reports.',
    example: 'Central Mall Parking has had 14 completed check-ins in the last 4 hours with zero reported issues.',
    styles: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    dotColor: 'bg-emerald-500',
    indicatorBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  MEDIUM: {
    level: 'MEDIUM',
    title: 'Medium Confidence',
    badgeLabel: 'Availability confidence: Medium',
    badgeShort: 'Medium confidence',
    description: `Moderate activity or an isolated recent issue. ${CONFIDENCE_BASIS}`,
    meaning: 'Moderate booking volume, older operator updates, or an isolated minor report that did not affect subsequent drivers.',
    example: 'Station Metro Lot had 1 driver report a full bay 3 hours ago, but subsequent reservations checked in without issue.',
    styles: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
    dotColor: 'bg-amber-500',
    indicatorBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  LOW: {
    level: 'LOW',
    title: 'Low Confidence',
    badgeLabel: 'Availability confidence: Low',
    badgeShort: 'Low confidence',
    description: `Multiple conflicting driver reports or high capacity variance. ${CONFIDENCE_BASIS}`,
    meaning: 'Limited recent activity, multiple unverified driver turnaways, or conflicting capacity updates.',
    example: 'Several drivers recently reported that bays marked available were taken or access was hindered.',
    styles: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
    dotColor: 'bg-orange-500',
    indicatorBg: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  UNDER_REVIEW: {
    level: 'UNDER_REVIEW',
    title: 'Under Review',
    badgeLabel: 'Parking lot under review',
    badgeShort: 'Under review',
    description: `Bookings paused while administrators inspect serious reports. ${CONFIDENCE_BASIS}`,
    meaning: 'Multiple serious driver reports triggered an automatic safety hold. New bookings are suspended until manual inspection confirms accuracy.',
    example: 'Drivers reported the lot was permanently closed or charging unauthorized fees; reservations are temporarily halted during investigation.',
    styles: 'bg-red-100 text-red-700 ring-1 ring-red-300',
    dotColor: 'bg-red-500',
    indicatorBg: 'bg-red-50 text-red-700 border-red-200',
  },
};

const CONFIDENCE_COPY: Record<
  AvailabilityConfidence,
  { label: string; description: string; styles: string }
> = {
  HIGH: {
    label: CONFIDENCE_DETAILS.HIGH.badgeLabel,
    description: CONFIDENCE_DETAILS.HIGH.description,
    styles: CONFIDENCE_DETAILS.HIGH.styles,
  },
  MEDIUM: {
    label: CONFIDENCE_DETAILS.MEDIUM.badgeLabel,
    description: CONFIDENCE_DETAILS.MEDIUM.description,
    styles: CONFIDENCE_DETAILS.MEDIUM.styles,
  },
  LOW: {
    label: CONFIDENCE_DETAILS.LOW.badgeLabel,
    description: CONFIDENCE_DETAILS.LOW.description,
    styles: CONFIDENCE_DETAILS.LOW.styles,
  },
  UNDER_REVIEW: {
    label: CONFIDENCE_DETAILS.UNDER_REVIEW.badgeLabel,
    description: CONFIDENCE_DETAILS.UNDER_REVIEW.description,
    styles: CONFIDENCE_DETAILS.UNDER_REVIEW.styles,
  },
};

export function getConfidenceCopy(confidence: AvailabilityConfidence) {
  return CONFIDENCE_COPY[confidence] || CONFIDENCE_COPY.HIGH;
}

export function getConfidenceDetail(confidence: AvailabilityConfidence): ConfidenceDetail {
  return CONFIDENCE_DETAILS[confidence] || CONFIDENCE_DETAILS.HIGH;
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
