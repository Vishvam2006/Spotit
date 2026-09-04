import type { Booking, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { geofenceConfig } from '../../config/geofence';
import { recordEvent } from '../continuity/continuity.events';
import { releaseCapacity } from '../continuity/continuity.service';
import { sortByDistance } from '../../utils/distance';
import { bookingInclude, mapBooking, type BookingWithLot } from '../booking/booking.service';

export class ReassignmentError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ReassignmentError';
    this.statusCode = statusCode;
  }
}

/** How long a user has to accept or decline a held alternative before it auto-accepts. */
const REASSIGNMENT_DECISION_WINDOW_MS = 5 * 60_000;

/** Nearest-first candidates to try before giving up and falling back to SmartSuggest. */
const MAX_CANDIDATE_ATTEMPTS = 3;

/**
 * Attempts to hold the nearest available alternative lot for a booking that
 * was just cancelled by a deactivation. Runs inside the same transaction as
 * the cancellation, so it is atomic with it and serialized against
 * concurrent bookings on the candidate lot via that lot's own row lock.
 *
 * A no-op (no BookingReassignment row created) if no candidate lot has room
 * or every attempt loses the capacity race -- that is what makes "no
 * candidate" behave identically to the engine's original, purely
 * client-side SmartSuggest behaviour.
 */
export async function findAndHoldCandidate(
  tx: Prisma.TransactionClient,
  originalBooking: Booking,
  excludeLotId: string,
  anchor: { latitude: number; longitude: number },
): Promise<void> {
  const candidateLots = await tx.parkingLot.findMany({
    where: {
      status: 'ACTIVE',
      availableSpaces: { gt: 0 },
      id: { not: excludeLotId },
      // A user can never be "reassigned" into their own listing.
      ownerId: { not: originalBooking.userId },
    },
  });

  if (candidateLots.length === 0) {
    return;
  }

  const sorted = sortByDistance(candidateLots, anchor.latitude, anchor.longitude);

  for (const candidateLot of sorted.slice(0, MAX_CANDIDATE_ATTEMPTS)) {
    await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${candidateLot.id} FOR UPDATE`;

    const claimed = await tx.parkingLot.updateMany({
      where: { id: candidateLot.id, status: 'ACTIVE', availableSpaces: { gt: 0 } },
      data: { availableSpaces: { decrement: 1 } },
    });

    if (claimed.count !== 1) {
      // Lost the race for this lot's last space; try the next-nearest.
      continue;
    }

    const now = new Date();
    const requestedEnd = new Date(now.getTime() + originalBooking.durationMinutes * 60_000);

    // Same overlap guard createBooking uses, extended to also treat a
    // pending reassignment offer as a blocking reservation.
    const overlapping = await tx.booking.findFirst({
      where: {
        userId: originalBooking.userId,
        id: { not: originalBooking.id },
        OR: [
          {
            status: 'ACTIVE',
            checkInTime: { lte: requestedEnd },
            sessionEndsAt: { gte: now },
          },
          {
            status: 'RESERVED',
            reservedAt: { lte: requestedEnd },
            checkInDeadline: { gte: now },
          },
          {
            status: 'PENDING_REASSIGNMENT',
            reservedAt: { lte: requestedEnd },
            checkInDeadline: { gte: now },
          },
        ],
      },
    });

    if (overlapping) {
      // The block is the user's own schedule, not this lot's availability --
      // give back the space just claimed and don't try further candidates.
      await releaseCapacity(tx, candidateLot.id);
      return;
    }

    const decisionDeadline = new Date(now.getTime() + REASSIGNMENT_DECISION_WINDOW_MS);

    const candidateBooking = await tx.booking.create({
      data: {
        userId: originalBooking.userId,
        parkingLotId: candidateLot.id,
        vehicleNumber: originalBooking.vehicleNumber,
        vehicleId: originalBooking.vehicleId,
        vehicleRegistration: originalBooking.vehicleRegistration,
        vehicleType: originalBooking.vehicleType,
        vehicleImageUrl: originalBooking.vehicleImageUrl,
        vehicleMake: originalBooking.vehicleMake,
        vehicleModel: originalBooking.vehicleModel,
        vehicleColor: originalBooking.vehicleColor,
        durationMinutes: originalBooking.durationMinutes,
        reservedAt: now,
        // Booking.checkInDeadline is NOT NULL. Until accept/auto-accept this
        // value is a placeholder equal to the offer's own decision deadline;
        // it gets re-stamped to a fresh full check-in window the moment the
        // booking actually becomes RESERVED, so the check-in clock never
        // runs while the offer is merely pending.
        checkInDeadline: decisionDeadline,
        estimatedAmount: candidateLot.pricePerHour * (originalBooking.durationMinutes / 60),
        status: 'PENDING_REASSIGNMENT',
      },
    });

    await tx.bookingReassignment.create({
      data: {
        originalBookingId: originalBooking.id,
        candidateBookingId: candidateBooking.id,
        candidateLotId: candidateLot.id,
        status: 'PENDING',
        offeredAt: now,
        decisionDeadline,
        distanceKm: candidateLot.distanceKm,
      },
    });

    await recordEvent(tx, {
      type: 'REASSIGNMENT_OFFERED',
      bookingId: candidateBooking.id,
      parkingLotId: candidateLot.id,
      actorId: null,
      actorRole: null,
      toStatus: 'PENDING_REASSIGNMENT',
      reason: 'A nearby lot was automatically held after the original booking was cancelled.',
      metadata: {
        originalBookingId: originalBooking.id,
        distanceKm: candidateLot.distanceKm,
      },
    });

    return;
  }
}

export interface ReassignmentOfferDTO {
  id: string;
  status: 'PENDING';
  decisionDeadline: string | null;
  distanceKm: number | null;
  candidateBookingId: string;
  estimatedAmount: number | null;
  candidateLot: {
    id: string;
    name: string;
    address: string;
    city: string;
    pricePerHour: number;
  };
}

/** The current user's still-open offer, or null if they don't have one. */
export async function getPendingReassignmentForUser(
  userId: string,
): Promise<ReassignmentOfferDTO | null> {
  const offer = await prisma.bookingReassignment.findFirst({
    where: {
      status: 'PENDING',
      originalBooking: { userId },
    },
    include: {
      candidateBooking: { include: { parkingLot: true } },
    },
  });

  if (!offer || !offer.candidateBooking) {
    return null;
  }

  return {
    id: offer.id,
    status: 'PENDING',
    decisionDeadline: offer.decisionDeadline?.toISOString() ?? null,
    distanceKm: offer.distanceKm,
    candidateBookingId: offer.candidateBooking.id,
    estimatedAmount: offer.candidateBooking.estimatedAmount,
    candidateLot: {
      id: offer.candidateBooking.parkingLot.id,
      name: offer.candidateBooking.parkingLot.name,
      address: offer.candidateBooking.parkingLot.address,
      city: offer.candidateBooking.parkingLot.city,
      pricePerHour: offer.candidateBooking.parkingLot.pricePerHour,
    },
  };
}

/**
 * Fetches an offer and confirms it belongs to the given user. This is a
 * read-only, non-transactional check used to decide *which* flow applies
 * (explicit accept vs. paying for an already-auto-accepted booking) --
 * correctness never depends on it, since the actual state changes below are
 * always behind their own guarded, atomic updates.
 */
export async function getReassignmentOwnedByUser(userId: string, reassignmentId: string) {
  const offer = await prisma.bookingReassignment.findUnique({
    where: { id: reassignmentId },
    include: { originalBooking: { select: { userId: true } } },
  });

  if (!offer || offer.originalBooking.userId !== userId) {
    throw new ReassignmentError(404, 'Reassignment offer not found');
  }

  return offer;
}

/**
 * The user explicitly accepts a held offer. Guarded by a single atomic
 * `PENDING -> ACCEPTED` update -- this is the one thing standing between this
 * call and the auto-accept sweeper both succeeding on the same offer, so it
 * must stay a single guarded write.
 */
export async function acceptReassignment(
  userId: string,
  reassignmentId: string,
): Promise<BookingWithLot> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const offer = await tx.bookingReassignment.findUnique({
      where: { id: reassignmentId },
      include: { originalBooking: { select: { userId: true } } },
    });

    if (!offer || offer.originalBooking.userId !== userId) {
      throw new ReassignmentError(404, 'Reassignment offer not found');
    }

    if (!offer.candidateBookingId) {
      throw new ReassignmentError(409, 'This offer has no held booking to accept.');
    }

    const claimed = await tx.bookingReassignment.updateMany({
      where: {
        id: reassignmentId,
        status: 'PENDING',
        OR: [{ decisionDeadline: null }, { decisionDeadline: { gt: now } }],
      },
      data: { status: 'ACCEPTED', respondAt: now },
    });

    if (claimed.count !== 1) {
      throw new ReassignmentError(409, 'This offer is no longer pending.');
    }

    const checkInDeadline = new Date(
      now.getTime() + geofenceConfig.checkInDeadlineMinutes * 60_000,
    );

    const updated = await tx.booking.updateMany({
      where: { id: offer.candidateBookingId, status: 'PENDING_REASSIGNMENT' },
      data: { status: 'RESERVED', checkInDeadline },
    });

    if (updated.count !== 1) {
      throw new ReassignmentError(
        409,
        'This booking changed unexpectedly. Please refresh and try again.',
      );
    }

    const candidate = await tx.booking.findUniqueOrThrow({
      where: { id: offer.candidateBookingId },
      include: bookingInclude,
    });

    await recordEvent(tx, {
      type: 'REASSIGNMENT_ACCEPTED',
      bookingId: candidate.id,
      parkingLotId: candidate.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'PENDING_REASSIGNMENT',
      toStatus: 'RESERVED',
      reason: 'The user accepted the automatically held alternative.',
    });

    return mapBooking(candidate);
  });
}

/**
 * The user explicitly declines a held offer: the candidate booking is
 * cancelled and its capacity released, leaving the original (already
 * cancelled) booking to fall back to SmartSuggest exactly as before this
 * feature existed.
 */
export async function declineReassignment(
  userId: string,
  reassignmentId: string,
): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const offer = await tx.bookingReassignment.findUnique({
      where: { id: reassignmentId },
      include: { originalBooking: { select: { userId: true } } },
    });

    if (!offer || offer.originalBooking.userId !== userId) {
      throw new ReassignmentError(404, 'Reassignment offer not found');
    }

    if (!offer.candidateBookingId || !offer.candidateLotId) {
      throw new ReassignmentError(409, 'This offer has no held booking to decline.');
    }

    const claimed = await tx.bookingReassignment.updateMany({
      where: { id: reassignmentId, status: 'PENDING' },
      data: { status: 'DECLINED', respondAt: now },
    });

    if (claimed.count !== 1) {
      throw new ReassignmentError(409, 'This offer is no longer pending.');
    }

    const cancelled = await tx.booking.updateMany({
      where: { id: offer.candidateBookingId, status: 'PENDING_REASSIGNMENT' },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'REASSIGNMENT_DECLINED',
        cancelledAt: now,
      },
    });

    if (cancelled.count !== 1) {
      return;
    }

    await releaseCapacity(tx, offer.candidateLotId);

    await recordEvent(tx, {
      type: 'REASSIGNMENT_DECLINED',
      bookingId: offer.candidateBookingId,
      parkingLotId: offer.candidateLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'PENDING_REASSIGNMENT',
      toStatus: 'CANCELLED',
      reason: 'The user declined the automatically held alternative.',
    });
    await recordEvent(tx, {
      type: 'CAPACITY_RELEASED',
      bookingId: offer.candidateBookingId,
      parkingLotId: offer.candidateLotId,
      reason: 'Reassignment declined.',
    });
  });
}

/**
 * Auto-accepts every offer whose decision window has passed. Only performs
 * the state transition -- creating the (uncaptured) payment order for each
 * newly-RESERVED booking is the caller's job (see reassignmentSweeper.ts),
 * so this module never has to import payment.service.
 *
 * Same `updateMany`-with-status-guard idempotency as sessionSweeper.ts: if a
 * user accepts via /verify at the exact moment this runs, whichever write
 * lands first wins the row and the other no-ops.
 */
export async function finalizeDueOffers(): Promise<BookingWithLot[]> {
  const now = new Date();

  const due = await prisma.bookingReassignment.findMany({
    where: { status: 'PENDING', decisionDeadline: { lt: now } },
    select: { id: true, candidateBookingId: true },
  });

  const finalized: BookingWithLot[] = [];

  for (const offer of due) {
    if (!offer.candidateBookingId) continue;
    const candidateBookingId = offer.candidateBookingId;

    const booking = await prisma.$transaction(async (tx) => {
      const claimed = await tx.bookingReassignment.updateMany({
        where: { id: offer.id, status: 'PENDING' },
        data: { status: 'AUTO_ACCEPTED', respondAt: now },
      });

      if (claimed.count !== 1) {
        return null;
      }

      const checkInDeadline = new Date(
        now.getTime() + geofenceConfig.checkInDeadlineMinutes * 60_000,
      );

      const updated = await tx.booking.updateMany({
        where: { id: candidateBookingId, status: 'PENDING_REASSIGNMENT' },
        data: { status: 'RESERVED', checkInDeadline },
      });

      if (updated.count !== 1) {
        throw new ReassignmentError(
          409,
          'Candidate booking changed unexpectedly during auto-accept.',
        );
      }

      const candidate = await tx.booking.findUniqueOrThrow({
        where: { id: candidateBookingId },
        include: bookingInclude,
      });

      // RESERVED + Payment still uncaptured (created moments later by the
      // caller) is an intentional state meaning "the spot is reserved but
      // payment is still outstanding" -- not a bug to reconcile later.
      await recordEvent(tx, {
        type: 'REASSIGNMENT_AUTO_ACCEPTED',
        bookingId: candidate.id,
        parkingLotId: candidate.parkingLotId,
        actorId: null,
        actorRole: null,
        fromStatus: 'PENDING_REASSIGNMENT',
        toStatus: 'RESERVED',
        reason:
          'No response within the decision window; the held spot was auto-accepted. Payment is still outstanding.',
      });

      return mapBooking(candidate);
    });

    if (booking) {
      finalized.push(booking);
    }
  }

  return finalized;
}
