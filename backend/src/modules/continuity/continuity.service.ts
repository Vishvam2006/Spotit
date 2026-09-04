import type {
  BookingStatus,
  ComplaintStatus,
  IssueType,
  Prisma,
  Role,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { recordEvent } from './continuity.events';
import {
  ContinuityError,
  assertTransition,
  holdsCapacity,
  isDisputable,
  isReportable,
} from './continuity.states';
import {
  OPEN_REPORT_STATUSES,
  confidenceForOpenReports,
  countOpenSeriousReports,
  isSerious,
  recomputeLotReliability,
  severityFor,
} from './continuity.reliability';
import type { ReportIssueInput, ResolveReportInput, ReportLotIssueInput } from './continuity.validation';

export { ContinuityError };

/** Human-readable label stored on the complaint's legacy `category` column. */
const ISSUE_LABELS: Record<IssueType, string> = {
  SPACE_UNAVAILABLE: 'Reserved space unavailable',
  LOT_FULL: 'Parking lot full',
  LOT_CLOSED: 'Parking lot closed',
  MISLEADING_LISTING: 'Misleading listing',
  ACCESS_BLOCKED: 'Access blocked',
  OTHER: 'Other',
};

export function issueLabel(issueType: IssueType): string {
  return ISSUE_LABELS[issueType];
}

/**
 * Returns a held space to a lot's counter.
 *
 * Guarded against overshooting `totalSpaces`: every path that releases a space
 * believes it is releasing one this booking holds, and a double release would
 * otherwise invent capacity that does not physically exist — exactly the
 * failure this engine is here to prevent.
 */
export async function releaseCapacity(
  tx: Prisma.TransactionClient,
  parkingLotId: string,
): Promise<boolean> {
  const released = await tx.$executeRaw`
    UPDATE "ParkingLot"
       SET "availableSpaces" = "availableSpaces" + 1
     WHERE id = ${parkingLotId}
       AND "availableSpaces" < "totalSpaces"
  `;

  return released === 1;
}

/**
 * Records a lifecycle step for a booking. Thin wrapper so the booking service
 * reads as a sequence of business events rather than ledger plumbing.
 */
export async function recordBookingEvent(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    type: Parameters<typeof recordEvent>[1]['type'];
    bookingId: string;
    parkingLotId: string;
    actorId?: string | null;
    actorRole?: Role | null;
    fromStatus?: BookingStatus | null;
    toStatus?: BookingStatus | null;
    reason?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await recordEvent(tx, params);
}

export interface ReportIssueResult {
  report: Prisma.ComplaintGetPayload<{
    include: { parkingLot: true; booking: true };
  }>;
  bookingStatus: BookingStatus;
  bookingProtected: boolean;
  lotUnderReview: boolean;
  openSeriousReports: number;
}

/**
 * The failure path of the Continuity Engine.
 *
 * A user who arrives to a lot that cannot honour their booking files a report
 * here. In one transaction this:
 *
 *   1. writes the report, tied to user + booking + lot + time + photos;
 *   2. freezes the booking as DISPUTED (never deletes or cancels it) so the
 *      evidence survives;
 *   3. hands the held space back to the lot, since the user never parked;
 *   4. re-scores the lot, pulling it from search if the reports have piled up.
 *
 * All four succeed together or none do, so a report can never end up filed
 * against a booking that was never protected.
 */
export async function reportBookingIssue(
  userId: string,
  bookingId: string,
  input: ReportIssueInput,
): Promise<ReportIssueResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: { parkingLot: { select: { id: true, status: true } } },
    });

    if (!booking) {
      throw new ContinuityError(404, 'Booking not found');
    }

    // Lock the lot before reading report counts, so two users reporting the
    // same lot at the same moment cannot both see "1 open report" and leave
    // the lot one escalation short of where it belongs.
    await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${booking.parkingLotId} FOR UPDATE`;

    // Checked before the state guard: once the first report has moved the
    // booking to DISPUTED, "a disputed booking cannot be reported" would be a
    // confusing way to say "you already told us".
    //
    // Scoped to the lot, not just this booking: a direct lot report (no
    // booking attached) counts against the same lot's open-serious total, so
    // checking only `bookingId` would let one user file both a booking report
    // and a direct report for the same incident and single-handedly supply
    // two of the two reports needed to escalate a lot to UNDER_REVIEW.
    const existingOpenReport = await tx.complaint.findFirst({
      where: {
        parkingLotId: booking.parkingLotId,
        userId,
        status: { in: [...OPEN_REPORT_STATUSES] },
      },
      select: { id: true },
    });

    if (existingOpenReport) {
      throw new ContinuityError(
        409,
        'You already have an open report for this parking lot. We are on it.',
      );
    }

    if (!isReportable(booking.status)) {
      throw new ContinuityError(
        409,
        `A ${booking.status.toLowerCase()} booking cannot be reported.`,
      );
    }

    const severity = severityFor(input.issueType);
    const serious = isSerious(input.issueType);

    const report = await tx.complaint.create({
      data: {
        userId,
        bookingId,
        // Always taken from the booking rather than the request, so a report
        // can never be pinned on a lot the user did not actually book.
        parkingLotId: booking.parkingLotId,
        issueType: input.issueType,
        severity,
        photos: input.photos ?? [],
        category: ISSUE_LABELS[input.issueType],
        subject: ISSUE_LABELS[input.issueType],
        description: input.description,
      },
      include: { parkingLot: true, booking: true },
    });

    await recordEvent(tx, {
      type: 'ISSUE_REPORTED',
      bookingId,
      parkingLotId: booking.parkingLotId,
      complaintId: report.id,
      actorId: userId,
      actorRole: 'USER',
      reason: ISSUE_LABELS[input.issueType],
      metadata: {
        issueType: input.issueType,
        severity,
        photoCount: report.photos.length,
      },
    });

    let bookingStatus: BookingStatus = booking.status;
    let bookingProtected = false;

    // Only a serious report freezes the booking, and only while the booking is
    // still live. A MINOR note ("OTHER") should not tear down a parking session
    // that is working fine; and a COMPLETED or EXPIRED booking has nothing left
    // to protect, so the report files against the lot without rewriting a
    // session that already happened. Either way the report is recorded and the
    // lot is re-scored below — reporting late still costs the lot its standing.
    if (serious && isDisputable(booking.status)) {
      assertTransition(booking.status, 'DISPUTED');

      const disputed = await tx.booking.updateMany({
        where: { id: bookingId, userId, status: booking.status },
        data: { status: 'DISPUTED', disputedAt: new Date() },
      });

      if (disputed.count !== 1) {
        // The booking moved underneath us (checked in, expired, swept). Fail
        // the whole transaction rather than filing a report that claims to
        // have protected a booking it did not.
        throw new ContinuityError(
          409,
          'This booking changed while you were reporting. Please reopen it and try again.',
        );
      }

      bookingStatus = 'DISPUTED';
      bookingProtected = true;

      await recordEvent(tx, {
        type: 'BOOKING_DISPUTED',
        bookingId,
        parkingLotId: booking.parkingLotId,
        complaintId: report.id,
        actorId: userId,
        actorRole: 'USER',
        fromStatus: booking.status,
        toStatus: 'DISPUTED',
        reason: ISSUE_LABELS[input.issueType],
      });

      // The user never occupied the space, so the hold must come back — the
      // lot is already suspect and must not also be short a space.
      if (holdsCapacity(booking.status)) {
        const released = await releaseCapacity(tx, booking.parkingLotId);
        if (released) {
          await recordEvent(tx, {
            type: 'CAPACITY_RELEASED',
            bookingId,
            parkingLotId: booking.parkingLotId,
            complaintId: report.id,
            actorId: userId,
            actorRole: 'USER',
            reason: 'Booking disputed before the space was used.',
          });
        }
      }
    }

    const reliability = await recomputeLotReliability(tx, booking.parkingLotId, {
      actorId: userId,
      actorRole: 'USER',
      complaintId: report.id,
      reason: `New ${severity.toLowerCase()} report: ${ISSUE_LABELS[input.issueType]}`,
    });

    return {
      report,
      bookingStatus,
      bookingProtected,
      lotUnderReview: reliability.underReview,
      openSeriousReports: reliability.openSeriousReports,
    };
  });
}

/**
 * Haversine formula to calculate distance between two coordinates in meters.
 */
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface ReportLotIssueResult {
  report: Prisma.ComplaintGetPayload<{
    include: { parkingLot: true };
  }>;
  lotUnderReview: boolean;
  openSeriousReports: number;
}

/**
 * Direct reporting of a parking lot (no booking involved).
 * Requires the user's location to prove they are physically at the lot,
 * mitigating competitor sabotage/spam.
 */
export async function reportLotIssue(
  userId: string,
  parkingLotId: string,
  input: ReportLotIssueInput,
): Promise<ReportLotIssueResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock lot to prevent concurrent updates missing the threshold.
    const lot = await tx.$queryRaw<Array<{ id: string; latitude: number; longitude: number }>>`
      SELECT id, latitude, longitude FROM "ParkingLot" WHERE id = ${parkingLotId} FOR UPDATE
    `;

    if (!lot || lot.length === 0) {
      throw new ContinuityError(404, 'Parking lot not found');
    }

    const { latitude: lotLat, longitude: lotLng } = lot[0];

    // 2. Geofencing Check: Ensure user is within 200 meters of the lot.
    if (input.latitude == null || input.longitude == null) {
      throw new ContinuityError(400, 'Location is required to report a parking lot directly.');
    }
    
    const distanceMeters = getDistanceMeters(input.latitude, input.longitude, lotLat, lotLng);
    if (distanceMeters > 200) {
      throw new ContinuityError(403, 'You must be near the parking lot to report it directly.');
    }

    // 3. Prevent Spam: check if the user already has an open report for this
    // lot, from either channel — a booking-linked report already counts
    // against this lot's open-serious total, so it must block a second,
    // direct report for the same incident just as a second direct report
    // would.
    const existingOpenReport = await tx.complaint.findFirst({
      where: {
        parkingLotId,
        userId,
        status: { in: [...OPEN_REPORT_STATUSES] },
      },
      select: { id: true },
    });

    if (existingOpenReport) {
      throw new ContinuityError(
        409,
        'You already have an open report for this parking lot. We are on it.',
      );
    }

    const severity = severityFor(input.issueType);

    // 4. Create the Complaint
    const report = await tx.complaint.create({
      data: {
        userId,
        parkingLotId,
        bookingId: null,
        issueType: input.issueType,
        severity,
        photos: input.photos ?? [],
        category: ISSUE_LABELS[input.issueType],
        subject: ISSUE_LABELS[input.issueType],
        description: input.description,
      },
      include: { parkingLot: true },
    });

    // 5. Append Ledger Event
    await recordEvent(tx, {
      type: 'ISSUE_REPORTED',
      bookingId: null,
      parkingLotId,
      complaintId: report.id,
      actorId: userId,
      actorRole: 'USER',
      reason: ISSUE_LABELS[input.issueType],
      metadata: {
        issueType: input.issueType,
        severity,
        photoCount: report.photos.length,
        directReport: true,
        distanceMeters,
      },
    });

    // 6. Recompute Reliability (will escalate if SERIOUS count reaches threshold)
    const reliability = await recomputeLotReliability(tx, parkingLotId, {
      actorId: userId,
      actorRole: 'USER',
      complaintId: report.id,
      reason: `New direct ${severity.toLowerCase()} report: ${ISSUE_LABELS[input.issueType]}`,
    });

    return {
      report,
      lotUnderReview: reliability.underReview,
      openSeriousReports: reliability.openSeriousReports,
    };
  });
}

/**
 * Closes out a report. Called by an admin from the dashboard, or by an owner
 * acknowledging an issue on their own lot.
 *
 * Resolving updates the *report*, never the booking: a DISPUTED booking stays
 * DISPUTED forever, because it is the record of what the user actually
 * experienced. What resolution changes is the lot's standing — clearing the
 * report is what lets a lot climb back out of review.
 */
export async function resolveReport(
  actorId: string,
  actorRole: Role,
  reportId: string,
  input: ResolveReportInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.complaint.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        parkingLotId: true,
        bookingId: true,
        parkingLot: { select: { ownerId: true } },
      },
    });

    if (!existing) {
      throw new ContinuityError(404, 'Report not found');
    }

    if (actorRole === 'OWNER') {
      if (existing.parkingLot?.ownerId !== actorId) {
        throw new ContinuityError(403, 'This report is not for one of your lots.');
      }

      // An owner may acknowledge a report but never close one: closing is what
      // restores their own lot's reliability score, so letting them do it would
      // make the review meaningless.
      if (input.status !== 'IN_REVIEW') {
        throw new ContinuityError(
          403,
          'You can acknowledge a report, but only an admin can close it.',
        );
      }
    }

    if (existing.parkingLotId) {
      await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${existing.parkingLotId} FOR UPDATE`;
    }

    const closing = input.status === 'RESOLVED' || input.status === 'REJECTED';

    const report = await tx.complaint.update({
      where: { id: reportId },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote ?? null,
        resolvedById: closing ? actorId : null,
        resolvedAt: closing ? new Date() : null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        parkingLot: { select: { id: true, name: true, address: true, city: true } },
        booking: { select: { id: true, status: true, reservedAt: true } },
      },
    });

    await recordEvent(tx, {
      type: 'REPORT_STATUS_CHANGED',
      bookingId: existing.bookingId,
      parkingLotId: existing.parkingLotId,
      complaintId: reportId,
      actorId,
      actorRole,
      fromStatus: existing.status,
      toStatus: input.status,
      reason: input.resolutionNote ?? null,
    });

    if (existing.parkingLotId) {
      await recomputeLotReliability(tx, existing.parkingLotId, {
        actorId,
        actorRole,
        complaintId: reportId,
        reason: `Report marked ${input.status}.`,
      });
    }

    return report;
  });
}

export interface LotReliability {
  parkingLotId: string;
  status: string;
  availabilityConfidence: string;
  openSeriousReports: number;
  openReports: number;
  totalReports: number;
  underReviewSince: Date | null;
}

/** The reliability picture for one lot, for owner and admin dashboards. */
export async function getLotReliability(
  parkingLotId: string,
): Promise<LotReliability> {
  const lot = await prisma.parkingLot.findUnique({
    where: { id: parkingLotId },
    select: {
      id: true,
      status: true,
      availabilityConfidence: true,
      underReviewSince: true,
    },
  });

  if (!lot) {
    throw new ContinuityError(404, 'Parking lot not found');
  }

  const [openSerious, openReports, totalReports] = await Promise.all([
    prisma.complaint.count({
      where: {
        parkingLotId,
        severity: 'SERIOUS',
        status: { in: [...OPEN_REPORT_STATUSES] },
      },
    }),
    prisma.complaint.count({
      where: { parkingLotId, status: { in: [...OPEN_REPORT_STATUSES] } },
    }),
    prisma.complaint.count({ where: { parkingLotId } }),
  ]);

  return {
    parkingLotId: lot.id,
    status: lot.status,
    availabilityConfidence: lot.availabilityConfidence,
    openSeriousReports: openSerious,
    openReports,
    totalReports,
    underReviewSince: lot.underReviewSince,
  };
}

/**
 * Reports filed against the lots one owner runs — the "parking owner receives
 * the issue" half of the accountability loop.
 */
export async function getOwnerReports(
  ownerId: string,
  query: { page: number; limit: number; status?: ComplaintStatus },
) {
  const where: Prisma.ComplaintWhereInput = {
    parkingLot: { ownerId },
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { id: true, fullName: true } },
        parkingLot: { select: { id: true, name: true, address: true, city: true } },
        booking: {
          select: {
            id: true,
            status: true,
            reservedAt: true,
            vehicleRegistration: true,
          },
        },
      },
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/**
 * Recomputes reliability for a lot outside any report flow — used when an
 * owner edits their listing or an admin changes a lot's status, so the two
 * never drift apart.
 */
export async function refreshLotReliability(
  parkingLotId: string,
  options: { actorId?: string; actorRole?: Role; reason?: string } = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${parkingLotId} FOR UPDATE`;
    await recomputeLotReliability(tx, parkingLotId, options);
  });
}

export { confidenceForOpenReports, countOpenSeriousReports, severityFor, isSerious };
