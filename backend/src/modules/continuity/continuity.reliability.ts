import type {
  AvailabilityConfidence,
  IssueSeverity,
  IssueType,
  Prisma,
  Role,
} from '@prisma/client';
import { recordEvent } from './continuity.events';
import { isEscalatable } from './continuity.states';

/**
 * How serious each kind of failure is.
 *
 * SERIOUS means "the lot's advertised availability was wrong", which is the
 * only thing that should cost a lot its reliability score. A dirty lot or an
 * unhelpful attendant is a real complaint, but it does not make
 * `availableSpaces` a lie, so it stays MINOR and never escalates the lot.
 */
const SEVERITY_BY_ISSUE: Record<IssueType, IssueSeverity> = {
  SPACE_UNAVAILABLE: 'SERIOUS',
  LOT_FULL: 'SERIOUS',
  LOT_CLOSED: 'SERIOUS',
  MISLEADING_LISTING: 'SERIOUS',
  ACCESS_BLOCKED: 'SERIOUS',
  OTHER: 'MINOR',
};

/** Open serious reports at or above which a lot is pulled from circulation. */
export const UNDER_REVIEW_THRESHOLD = 2;

export function severityFor(issueType: IssueType): IssueSeverity {
  return SEVERITY_BY_ISSUE[issueType];
}

export function isSerious(issueType: IssueType): boolean {
  return severityFor(issueType) === 'SERIOUS';
}

/**
 * Maps the count of unresolved serious reports to a confidence level.
 *
 *   0 open  -> HIGH    (nothing contradicts the owner's numbers)
 *   1 open  -> MEDIUM  (one user was turned away; still bookable)
 *  2+ open  -> LOW     (a pattern; the lot is pulled from search)
 *
 * Deliberately a plain count rather than a decayed score: it is trivial to
 * explain to a user, to an owner and to a judge, and it cannot drift.
 */
export function confidenceForOpenReports(
  openSeriousReports: number,
): AvailabilityConfidence {
  if (openSeriousReports >= UNDER_REVIEW_THRESHOLD) return 'LOW';
  if (openSeriousReports === 1) return 'MEDIUM';
  return 'HIGH';
}

export function shouldBeUnderReview(openSeriousReports: number): boolean {
  return openSeriousReports >= UNDER_REVIEW_THRESHOLD;
}

/** Reports that still count against a lot: submitted but not yet closed out. */
export const OPEN_REPORT_STATUSES = ['PENDING', 'IN_REVIEW'] as const;

export async function countOpenSeriousReports(
  tx: Prisma.TransactionClient,
  parkingLotId: string,
): Promise<number> {
  return tx.complaint.count({
    where: {
      parkingLotId,
      severity: 'SERIOUS',
      status: { in: [...OPEN_REPORT_STATUSES] },
    },
  });
}

export interface ReliabilityOutcome {
  openSeriousReports: number;
  confidence: AvailabilityConfidence;
  underReview: boolean;
  /** True when this call actually changed the lot row. */
  changed: boolean;
}

interface RecomputeOptions {
  actorId?: string | null;
  actorRole?: Role | null;
  reason?: string | null;
  complaintId?: string | null;
}

/**
 * Recomputes a lot's confidence and review status from its open serious
 * reports, and writes ledger events for whatever changed.
 *
 * This is the single place lot reliability is decided. Every caller — a new
 * report, an admin resolving one, an owner correcting their listing — funnels
 * through here, so the lot can never end up in a state the report counts do
 * not justify. It is idempotent: running it twice changes nothing the second
 * time.
 *
 * Must be called inside a transaction that already holds a row lock on the
 * lot, so concurrent reports cannot both read a stale count.
 */
export async function recomputeLotReliability(
  tx: Prisma.TransactionClient,
  parkingLotId: string,
  options: RecomputeOptions = {},
): Promise<ReliabilityOutcome> {
  const lot = await tx.parkingLot.findUnique({
    where: { id: parkingLotId },
    select: {
      id: true,
      status: true,
      availabilityConfidence: true,
      underReviewSince: true,
      statusBeforeReview: true,
    },
  });

  if (!lot) {
    return {
      openSeriousReports: 0,
      confidence: 'HIGH',
      underReview: false,
      changed: false,
    };
  }

  const openSeriousReports = await countOpenSeriousReports(tx, parkingLotId);
  const confidence = confidenceForOpenReports(openSeriousReports);
  const wantsReview = shouldBeUnderReview(openSeriousReports);
  const isUnderReview = lot.status === 'UNDER_REVIEW';

  const data: Prisma.ParkingLotUpdateInput = {};
  const events: Parameters<typeof recordEvent>[1][] = [];
  const now = new Date();

  if (confidence !== lot.availabilityConfidence) {
    data.availabilityConfidence = confidence;
    events.push({
      type: 'LOT_CONFIDENCE_CHANGED',
      parkingLotId,
      complaintId: options.complaintId ?? null,
      actorId: options.actorId ?? null,
      actorRole: options.actorRole ?? null,
      fromStatus: lot.availabilityConfidence,
      toStatus: confidence,
      reason: options.reason ?? null,
      metadata: { openSeriousReports },
    });
  }

  if (wantsReview && !isUnderReview && isEscalatable(lot.status)) {
    data.status = 'UNDER_REVIEW';
    data.underReviewSince = now;
    // Remember where to put the lot back, so reinstating never promotes a lot
    // the owner had taken down for their own reasons.
    data.statusBeforeReview = lot.status;
    events.push({
      type: 'LOT_UNDER_REVIEW',
      parkingLotId,
      complaintId: options.complaintId ?? null,
      actorId: options.actorId ?? null,
      actorRole: options.actorRole ?? null,
      fromStatus: lot.status,
      toStatus: 'UNDER_REVIEW',
      reason:
        options.reason ??
        `${openSeriousReports} unresolved serious reports for this lot.`,
      metadata: { openSeriousReports },
    });
  }

  if (!wantsReview && isUnderReview) {
    const restored = lot.statusBeforeReview ?? 'ACTIVE';
    data.status = restored;
    data.underReviewSince = null;
    data.statusBeforeReview = null;
    events.push({
      type: 'LOT_REINSTATED',
      parkingLotId,
      complaintId: options.complaintId ?? null,
      actorId: options.actorId ?? null,
      actorRole: options.actorRole ?? null,
      fromStatus: 'UNDER_REVIEW',
      toStatus: restored,
      reason: options.reason ?? 'Open serious reports fell below the threshold.',
      metadata: { openSeriousReports },
    });
  }

  const changed = Object.keys(data).length > 0;

  if (changed) {
    await tx.parkingLot.update({ where: { id: parkingLotId }, data });
    for (const event of events) {
      await recordEvent(tx, event);
    }
  }

  return {
    openSeriousReports,
    confidence,
    underReview: wantsReview || (isUnderReview && !changed),
    changed,
  };
}
