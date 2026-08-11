import { prisma } from '../config/prisma';
import { geofenceConfig } from '../config/geofence';

const DEFAULT_INTERVAL_MS = 15_000;

function parseInterval(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_INTERVAL_MS;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
}

export async function sweepExpiredReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.booking.findMany({
    where: {
      status: 'RESERVED',
      checkInDeadline: { lt: now },
    },
    select: { id: true, parkingLotId: true },
  });

  let expiredCount = 0;

  for (const booking of expired) {
    const result = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: 'RESERVED',
        checkInDeadline: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count === 1) {
      expiredCount += 1;
      await prisma.parkingLot.update({
        where: { id: booking.parkingLotId },
        data: { availableSpaces: { increment: 1 } },
      });
    }
  }

  return expiredCount;
}

export async function sweepCompletedSessions(): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(
    now.getTime() - geofenceConfig.sessionStaleSeconds * 1000,
  );

  const due = await prisma.booking.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { sessionEndsAt: { lte: now } },
        { lastSeenAt: { lt: staleBefore } },
        { lastSeenAt: null, checkInTime: { lt: staleBefore } },
      ],
    },
    select: {
      id: true,
      parkingLotId: true,
      checkInTime: true,
      sessionEndsAt: true,
      parkingLot: { select: { pricePerHour: true } },
    },
  });

  let completedCount = 0;

  for (const booking of due) {
    const sessionEndAt = booking.sessionEndsAt ?? now;
    const settledEnd = sessionEndAt.getTime() < now.getTime() ? sessionEndAt : now;
    const startedAt = booking.checkInTime ?? settledEnd;

    const elapsedHours = Math.max((settledEnd.getTime() - startedAt.getTime()) / 3_600_000, 0);

    const result = await prisma.booking.updateMany({
      where: { id: booking.id, status: 'ACTIVE' },
      data: {
        status: 'COMPLETED',
        checkOutTime: now,
        finalAmount: Math.max(
          Math.round((booking.parkingLot.pricePerHour ?? 0) * elapsedHours),
          0,
        ),
      },
    });

    if (result.count === 1) {
      completedCount += 1;
      await prisma.parkingLot.update({
        where: { id: booking.parkingLotId },
        data: { availableSpaces: { increment: 1 } },
      });
    }
  }

  return completedCount;
}

export async function runSessionSweep(): Promise<{
  expired: number;
  completed: number;
}> {
  const [expired, completed] = await Promise.all([
    sweepExpiredReservations(),
    sweepCompletedSessions(),
  ]);

  return { expired, completed };
}

export function startSessionSweeper(): { stop: () => void } {
  const intervalMs = parseInterval(process.env.SESSION_SWEEP_INTERVAL_MS);

  const timer = setInterval(() => {
    runSessionSweep().catch((error) => {
      console.error('[SessionSweeper] sweep failed:', error);
    });
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => {
      clearInterval(timer);
    },
  };
}