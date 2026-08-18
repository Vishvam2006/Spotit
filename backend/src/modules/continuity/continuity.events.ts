import type { ContinuityEventType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';

export interface RecordEventInput {
  type: ContinuityEventType;
  bookingId?: string | null;
  parkingLotId?: string | null;
  complaintId?: string | null;
  /** Null when the engine acted on its own, e.g. the background sweeper. */
  actorId?: string | null;
  actorRole?: Role | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Appends one row to the continuity ledger.
 *
 * Pass the surrounding transaction whenever the event describes a change made
 * in that transaction, so the state change and its audit row commit or roll
 * back together — an event that describes a rollback that never happened is
 * worse than no event at all.
 */
export async function recordEvent(
  db: Db,
  input: RecordEventInput,
): Promise<void> {
  await db.continuityEvent.create({
    data: {
      type: input.type,
      bookingId: input.bookingId ?? null,
      parkingLotId: input.parkingLotId ?? null,
      complaintId: input.complaintId ?? null,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata,
    },
  });
}

/**
 * Records many events in ledger order. Used where one engine action produces
 * several facts worth keeping (dispute + capacity release + lot escalation).
 */
export async function recordEvents(
  db: Db,
  inputs: RecordEventInput[],
): Promise<void> {
  for (const input of inputs) {
    await recordEvent(db, input);
  }
}

/**
 * The timeline for one booking, oldest first — this is what turns "my booking
 * says DISPUTED" into "here is exactly what happened and who did what".
 */
export async function getBookingTimeline(bookingId: string) {
  return prisma.continuityEvent.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getLotTimeline(parkingLotId: string, limit = 50) {
  return prisma.continuityEvent.findMany({
    where: { parkingLotId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
