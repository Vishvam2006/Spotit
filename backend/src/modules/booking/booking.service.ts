import { prisma } from '../../config/prisma';
import { geofenceConfig } from '../../config/geofence';
import type { Booking, ParkingLot, Prisma, VehicleType } from '@prisma/client';
import type { CreateBookingInput } from './booking.validation';
import { verifyLocationSample, type LocationSample } from './booking.geofence';
import { recordEvent } from '../continuity/continuity.events';
import { releaseCapacity } from '../continuity/continuity.service';

const CHECK_IN_EVENT = 'CHECK_IN_READING';
const CHECK_OUT_EVENT = 'CHECK_OUT_READING';

const VERIFICATION_PENDING_MESSAGE =
  'Keep your phone with you; we are verifying your location.';

export class BookingError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'BookingError';
    this.statusCode = statusCode;
  }
}

const bookingInclude = {
  parkingLot: true,
  payment: {
    select: {
      razorpayPaymentId: true,
      razorpayOrderId: true,
      amount: true,
      status: true,
    },
  },
} as const;

export interface BookingVehicle {
  id: string | null;
  registration: string;
  type: VehicleType;
  imageUrl: string;
  make: string | null;
  model: string | null;
  color: string | null;
}

/**
 * Builds the vehicle object returned to clients purely from the booking's
 * stored snapshot, so later edits or deletions of the Vehicle row never
 * change historical bookings.
 */
function toVehicle(
  booking: Pick<
    Booking,
    | 'vehicleId'
    | 'vehicleRegistration'
    | 'vehicleType'
    | 'vehicleImageUrl'
    | 'vehicleMake'
    | 'vehicleModel'
    | 'vehicleColor'
  >,
): BookingVehicle {
  return {
    id: booking.vehicleId,
    registration: booking.vehicleRegistration,
    type: booking.vehicleType,
    imageUrl: booking.vehicleImageUrl,
    make: booking.vehicleMake,
    model: booking.vehicleModel,
    color: booking.vehicleColor,
  };
}

export interface BookingPayment {
  razorpayPaymentId: string | null;
  razorpayOrderId: string;
  amount: number;
  status: string;
}

export type BookingWithLot = Booking & {
  parkingLot: ParkingLot;
  vehicle: BookingVehicle;
  payment?: BookingPayment | null;
};

function mapBooking(
  booking: Booking & { parkingLot: ParkingLot; payment?: BookingPayment | null },
): BookingWithLot {
  return { ...booking, vehicle: toVehicle(booking) };
}

async function expireReservedBookings(tx: Prisma.TransactionClient) {
  const now = new Date();

  const expired = await tx.booking.findMany({
    where: {
      status: 'RESERVED',
      checkInDeadline: { lt: now },
    },
    select: { id: true, parkingLotId: true },
  });

  for (const booking of expired) {
    const result = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: 'RESERVED',
        checkInDeadline: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count === 1) {
      await releaseCapacity(tx, booking.parkingLotId);

      await recordEvent(tx, {
        type: 'BOOKING_EXPIRED',
        bookingId: booking.id,
        parkingLotId: booking.parkingLotId,
        fromStatus: 'RESERVED',
        toStatus: 'EXPIRED',
        reason: 'The user did not check in before the deadline.',
      });
      await recordEvent(tx, {
        type: 'CAPACITY_RELEASED',
        bookingId: booking.id,
        parkingLotId: booking.parkingLotId,
        reason: 'Reservation expired without a check-in.',
      });
    }
  }
}

async function completeStaleSessions(tx: Prisma.TransactionClient) {
  const now = new Date();
  const staleBefore = new Date(
    now.getTime() - geofenceConfig.sessionStaleSeconds * 1000,
  );

  const stale = await tx.booking.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { lastSeenAt: { lt: staleBefore } },
        { lastSeenAt: null, checkInTime: { lt: staleBefore } },
      ],
    },
    select: {
      id: true,
      parkingLotId: true,
      checkInTime: true,
      parkingLot: { select: { pricePerHour: true } },
    },
  });

  for (const booking of stale) {
    const result = await tx.booking.updateMany({
      where: { id: booking.id, status: 'ACTIVE' },
      data: {
        status: 'COMPLETED',
        checkOutTime: now,
        finalAmount: booking.checkInTime
          ? Math.max(
              Math.round(
                (booking.parkingLot.pricePerHour ?? 0) *
                  ((now.getTime() - booking.checkInTime.getTime()) / 3_600_000),
              ),
              0,
            )
          : null,
      },
    });

    if (result.count === 1) {
      await releaseCapacity(tx, booking.parkingLotId);

      await recordEvent(tx, {
        type: 'CHECKED_OUT',
        bookingId: booking.id,
        parkingLotId: booking.parkingLotId,
        fromStatus: 'ACTIVE',
        toStatus: 'COMPLETED',
        reason: 'Session closed automatically after the phone stopped reporting.',
      });
      await recordEvent(tx, {
        type: 'CAPACITY_RELEASED',
        bookingId: booking.id,
        parkingLotId: booking.parkingLotId,
        reason: 'Stale session completed.',
      });
    }
  }
}

/**
 * Only a vehicle whose documents have passed AI verification may be parked.
 *
 * Checked here rather than at the route, so every path into a booking goes
 * through it, and checked before any capacity is touched so a rejected attempt
 * cannot leave a space held.
 *
 * `verificationStatus` is null until the vehicle has been through the engine,
 * and is reset to null whenever its registration is edited
 * (`vehicle.service.ts:173`) — so re-plating a verified vehicle drops it back
 * to unverified instead of carrying the old approval onto a new number.
 */
function assertVehicleIsVerified(vehicle: {
  verificationStatus: string | null;
}): void {
  if (vehicle.verificationStatus === 'VERIFIED') {
    return;
  }

  // Distinguished so the user knows whether to wait, resubmit, or start —
  // "not verified" alone leaves them with no next step.
  if (vehicle.verificationStatus === 'NEEDS_REVIEW') {
    throw new BookingError(
      403,
      'This vehicle is still being verified. You can book once its documents are approved.',
    );
  }

  if (vehicle.verificationStatus === 'REJECTED') {
    throw new BookingError(
      403,
      'This vehicle failed document verification. Re-upload its documents before booking.',
    );
  }

  throw new BookingError(
    403,
    'Verify this vehicle\'s documents before booking with it.',
  );
}

export async function createBooking(
  userId: string,
  input: CreateBookingInput,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);
    await completeStaleSessions(tx);

    const vehicle = await tx.vehicle.findFirst({
      where: { id: input.vehicleId, userId },
    });

    if (!vehicle) {
      throw new BookingError(404, 'Vehicle not found');
    }

    assertVehicleIsVerified(vehicle);

    const parkingLot = await tx.parkingLot.findUnique({
      where: { id: input.parkingLotId },
    });

    if (!parkingLot) {
      throw new BookingError(404, 'Parking lot not found');
    }

    // Serialize concurrent booking attempts on the same parking lot and the
    // same user so the overlap check + space decrement + booking insert are
    // atomic. Without these locks two parallel requests could both pass the
    // availability checks (double-booking / overselling).
    await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${parkingLot.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

    if (parkingLot.ownerId === userId) {
      throw new BookingError(409, 'You cannot book your own parking spot');
    }

    if (parkingLot.status !== 'ACTIVE') {
      throw new BookingError(409, 'Parking lot is not active');
    }

    const now = new Date();
    const checkInDeadline = new Date(
      now.getTime() + geofenceConfig.checkInDeadlineMinutes * 60_000,
    );
    const requestedEnd = new Date(now.getTime() + input.durationMinutes * 60_000);

    const overlapping = await tx.booking.findFirst({
      where: {
        userId,
        status: { in: ['RESERVED', 'ACTIVE'] },
        OR: [
          {
            // An active session occupies the slot until its planned end.
            status: 'ACTIVE',
            checkInTime: { lte: requestedEnd },
            sessionEndsAt: { gte: now },
          },
          {
            // A pending reservation holds the slot until its check-in deadline.
            status: 'RESERVED',
            reservedAt: { lte: requestedEnd },
            checkInDeadline: { gte: now },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BookingError(409, 'You already have an overlapping parking booking');
    }

    const updated = await tx.parkingLot.updateMany({
      where: {
        id: parkingLot.id,
        status: 'ACTIVE',
        availableSpaces: { gt: 0 },
      },
      data: { availableSpaces: { decrement: 1 } },
    });

    if (updated.count !== 1) {
      throw new BookingError(409, 'No parking spaces are available');
    }

    const estimatedAmount = parkingLot.pricePerHour * (input.durationMinutes / 60);

    const booking = await tx.booking.create({
      data: {
        userId,
        parkingLotId: parkingLot.id,
        vehicleNumber: vehicle.registration,
        vehicleId: vehicle.id,
        vehicleRegistration: vehicle.registration,
        vehicleType: vehicle.type,
        vehicleImageUrl: vehicle.imageUrl,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        durationMinutes: input.durationMinutes,
        reservedAt: now,
        checkInDeadline,
        checkInTime: null,
        sessionEndsAt: null,
        estimatedAmount,
      },
      include: bookingInclude,
    });

    await recordEvent(tx, {
      type: 'BOOKING_CREATED',
      bookingId: booking.id,
      parkingLotId: parkingLot.id,
      actorId: userId,
      actorRole: 'USER',
      toStatus: 'RESERVED',
      metadata: {
        durationMinutes: input.durationMinutes,
        checkInDeadline: checkInDeadline.toISOString(),
      },
    });
    await recordEvent(tx, {
      type: 'CAPACITY_HELD',
      bookingId: booking.id,
      parkingLotId: parkingLot.id,
      actorId: userId,
      actorRole: 'USER',
      reason: 'One space locked for this reservation.',
    });

    return mapBooking(booking);
  });
}

export async function getBookings(userId: string): Promise<BookingWithLot[]> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);
    await completeStaleSessions(tx);

    return tx.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: bookingInclude,
    }).then((bookings) => bookings.map(mapBooking));
  });
}

export async function getBookingById(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);
    await completeStaleSessions(tx);

    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new BookingError(404, 'Booking not found');
    }

    return mapBooking(booking);
  });
}

export async function checkInBooking(
  userId: string,
  bookingId: string,
  sample?: LocationSample,
): Promise<BookingWithLot> {
  if (!geofenceConfig.geofenceEnabled || geofenceConfig.demoMode) {
    return checkInBookingStatusOnly(userId, bookingId);
  }

  if (!sample) {
    throw new BookingError(409, 'Location data is invalid.');
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: bookingInclude,
  });

  if (!booking) {
    throw new BookingError(404, 'Booking not found');
  }

  if (booking.status === 'ACTIVE') {
    return mapBooking(booking);
  }

  if (booking.status !== 'RESERVED') {
    throw new BookingError(409, 'Booking cannot be checked in from its current state');
  }

  if (booking.checkInDeadline.getTime() <= Date.now()) {
    throw new BookingError(409, 'Booking cannot be checked in from its current state');
  }

  const verdict = verifyLocationSample(sample, booking.parkingLot, 'CHECK_IN');

  await prisma.locationAudit.create({
    data: {
      bookingId: booking.id,
      eventType: CHECK_IN_EVENT,
      lat: sample.lat,
      lng: sample.lng,
      distanceMeters: verdict.distanceMeters,
      accuracyMeters: sample.accuracy,
      capturedAt: sample.capturedAt,
      accepted: verdict.accepted,
      rejectionReason: verdict.rejectionReason,
    },
  });

  if (!verdict.accepted) {
    throw new BookingError(409, verdict.rejectionReason ?? 'Location data is invalid.');
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { lastLocationAt: new Date() },
  });

  const acceptedReadings = await prisma.locationAudit.findMany({
    where: { bookingId: booking.id, eventType: CHECK_IN_EVENT, accepted: true },
    orderBy: { capturedAt: 'asc' },
    select: { capturedAt: true },
  });

  const hasEnoughReadings =
    acceptedReadings.length >= geofenceConfig.minCheckinReadings;

  const dwellMs =
    acceptedReadings.length > 0
      ? acceptedReadings[acceptedReadings.length - 1].capturedAt.getTime() -
        acceptedReadings[0].capturedAt.getTime()
      : 0;

  const hasEnoughDwell = dwellMs >= geofenceConfig.minDwellSeconds * 1000;

  if (!hasEnoughReadings || !hasEnoughDwell) {
    throw new BookingError(202, VERIFICATION_PENDING_MESSAGE);
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const sessionEndsAt = new Date(
      now.getTime() + booking.durationMinutes * 60_000,
    );

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        userId,
        status: 'RESERVED',
        checkInDeadline: { gt: now },
      },
      data: { status: 'ACTIVE', checkInTime: now, sessionEndsAt },
    });

    if (updated.count === 0) {
      const current = await tx.booking.findFirst({
        where: { id: bookingId, userId },
        include: bookingInclude,
      });

      if (!current) {
        throw new BookingError(404, 'Booking not found');
      }

      if (current.status === 'ACTIVE') {
        return mapBooking(current);
      }

      throw new BookingError(409, 'Booking cannot be checked in from its current state');
    }

    const checkedIn = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!checkedIn) {
      throw new BookingError(404, 'Booking not found');
    }

    await recordEvent(tx, {
      type: 'CHECKED_IN',
      bookingId: checkedIn.id,
      parkingLotId: checkedIn.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'RESERVED',
      toStatus: 'ACTIVE',
      metadata: { sessionEndsAt: sessionEndsAt.toISOString() },
    });

    return mapBooking(checkedIn);
  });
}

async function checkInBookingStatusOnly(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentBooking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      select: { durationMinutes: true },
    });

    const sessionEndsAt = new Date(
      now.getTime() + (currentBooking?.durationMinutes ?? 0) * 60_000,
    );

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        userId,
        status: 'RESERVED',
        checkInDeadline: { gt: now },
      },
      data: { status: 'ACTIVE', checkInTime: now, sessionEndsAt },
    });

    if (updated.count === 0) {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId },
        include: bookingInclude,
      });

      if (!booking) {
        throw new BookingError(404, 'Booking not found');
      }

      if (booking.status === 'ACTIVE') {
        return mapBooking(booking);
      }

      throw new BookingError(409, 'Booking cannot be checked in from its current state');
    }

    const checkedIn = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!checkedIn) {
      throw new BookingError(404, 'Booking not found');
    }

    await recordEvent(tx, {
      type: 'CHECKED_IN',
      bookingId: checkedIn.id,
      parkingLotId: checkedIn.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'RESERVED',
      toStatus: 'ACTIVE',
      metadata: { sessionEndsAt: sessionEndsAt.toISOString() },
    });

    return mapBooking(checkedIn);
  });
}

export async function checkOutBooking(
  userId: string,
  bookingId: string,
  sample?: LocationSample,
): Promise<BookingWithLot> {
  if (!geofenceConfig.geofenceEnabled || geofenceConfig.demoMode) {
    return checkOutBookingStatusOnly(userId, bookingId);
  }

  if (!sample) {
    throw new BookingError(409, 'Location data is invalid.');
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: bookingInclude,
  });

  if (!booking) {
    throw new BookingError(404, 'Booking not found');
  }

  if (booking.status === 'COMPLETED') {
    return mapBooking(booking);
  }

  if (booking.status !== 'ACTIVE') {
    throw new BookingError(409, 'Booking can only be checked out while active');
  }

  const verdict = verifyLocationSample(sample, booking.parkingLot, 'CHECK_OUT');

  await prisma.locationAudit.create({
    data: {
      bookingId: booking.id,
      eventType: CHECK_OUT_EVENT,
      lat: sample.lat,
      lng: sample.lng,
      distanceMeters: verdict.distanceMeters,
      accuracyMeters: sample.accuracy,
      capturedAt: sample.capturedAt,
      accepted: verdict.accepted,
      rejectionReason: verdict.rejectionReason,
    },
  });

  if (!verdict.accepted) {
    throw new BookingError(202, verdict.rejectionReason ?? VERIFICATION_PENDING_MESSAGE);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { lastLocationAt: new Date() },
  });

  const checkInTime = booking.checkInTime;
  if (!checkInTime) {
    throw new BookingError(409, 'Booking is missing a check-in time');
  }

  const now = new Date();
  const graceMs = now.getTime() - checkInTime.getTime();
  if (graceMs < geofenceConfig.checkoutGraceSeconds * 1000) {
    throw new BookingError(202, VERIFICATION_PENDING_MESSAGE);
  }

  const recentReadings = await prisma.locationAudit.findMany({
    where: { bookingId: booking.id, eventType: CHECK_OUT_EVENT },
    orderBy: { capturedAt: 'desc' },
    take: geofenceConfig.requiredOutsideReadings,
  });

  const hasOutsideStreak =
    recentReadings.length >= geofenceConfig.requiredOutsideReadings &&
    recentReadings.every((reading) => reading.accepted);

  if (!hasOutsideStreak) {
    throw new BookingError(202, VERIFICATION_PENDING_MESSAGE);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, userId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', checkOutTime: now },
    });

    if (updated.count !== 1) {
      const current = await tx.booking.findFirst({
        where: { id: bookingId, userId },
        include: bookingInclude,
      });

      if (current?.status === 'COMPLETED') {
        return mapBooking(current);
      }

      throw new BookingError(409, 'Booking can only be checked out while active');
    }

    const elapsedHours = Math.max(
      (now.getTime() - checkInTime.getTime()) / 3_600_000,
      0,
    );

    const finalAmount = Math.round(
      (booking.parkingLot.pricePerHour ?? 0) * elapsedHours,
    );

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { finalAmount },
      include: bookingInclude,
    });

    await releaseCapacity(tx, booking.parkingLotId);

    await recordEvent(tx, {
      type: 'CHECKED_OUT',
      bookingId: updatedBooking.id,
      parkingLotId: updatedBooking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'ACTIVE',
      toStatus: 'COMPLETED',
      metadata: { finalAmount },
    });
    await recordEvent(tx, {
      type: 'CAPACITY_RELEASED',
      bookingId: updatedBooking.id,
      parkingLotId: updatedBooking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      reason: 'Session completed at check-out.',
    });

    return mapBooking(updatedBooking);
  });
}

async function checkOutBookingStatusOnly(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const existing = await tx.booking.findFirst({
      where: { id: bookingId, userId },
    });

    if (!existing) {
      throw new BookingError(404, 'Booking not found');
    }

    if (existing.status === 'COMPLETED') {
      const completed = await tx.booking.findFirst({
        where: { id: bookingId, userId },
        include: bookingInclude,
      });

      if (!completed) {
        throw new BookingError(404, 'Booking not found');
      }

      return mapBooking(completed);
    }

    const updated = await tx.booking.updateMany({
      where: { id: bookingId, userId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', checkOutTime: now },
    });

    if (updated.count !== 1) {
      throw new BookingError(409, 'Booking can only be checked out while active');
    }

    const checkInTime = existing.checkInTime;
    if (!checkInTime) {
      throw new BookingError(409, 'Booking is missing a check-in time');
    }

    const elapsedHours = Math.max(
      (now.getTime() - checkInTime.getTime()) / 3_600_000,
      0,
    );

    const parkingLot = await tx.parkingLot.findUnique({
      where: { id: existing.parkingLotId },
    });

    const finalAmount = Math.round((parkingLot?.pricePerHour ?? 0) * elapsedHours);

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { finalAmount },
      include: bookingInclude,
    });

    await releaseCapacity(tx, existing.parkingLotId);

    await recordEvent(tx, {
      type: 'CHECKED_OUT',
      bookingId: updatedBooking.id,
      parkingLotId: updatedBooking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'ACTIVE',
      toStatus: 'COMPLETED',
      metadata: { finalAmount },
    });
    await recordEvent(tx, {
      type: 'CAPACITY_RELEASED',
      bookingId: updatedBooking.id,
      parkingLotId: updatedBooking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      reason: 'Session completed at check-out.',
    });

    return mapBooking(updatedBooking);
  });
}

export async function heartbeatBooking(
  userId: string,
  bookingId: string,
  sample?: LocationSample,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);
    await completeStaleSessions(tx);

    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new BookingError(404, 'Booking not found');
    }

    if (booking.status === 'ACTIVE') {
      const now = new Date();
      const data: Prisma.BookingUpdateInput = { lastSeenAt: now };

      if (sample) {
        const geofenceOn = geofenceConfig.geofenceEnabled && !geofenceConfig.demoMode;
        if (!geofenceOn) {
          data.lastLocationAt = now;
        } else {
          const verdict = verifyLocationSample(sample, booking.parkingLot, 'CHECK_IN');
          if (verdict.accepted) {
            data.lastLocationAt = now;
          }
        }
      }

      await tx.booking.update({ where: { id: booking.id }, data });
    }

    const heartbeatBooking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!heartbeatBooking) {
      throw new BookingError(404, 'Booking not found');
    }

    return mapBooking(heartbeatBooking);
  });
}

export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, userId, status: 'RESERVED' },
      data: { status: 'CANCELLED', cancellationReason: 'USER_CANCELLED', cancelledAt: now },
    });

    if (updated.count === 0) {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId },
      });

      if (!booking) {
        throw new BookingError(404, 'Booking not found');
      }

      throw new BookingError(409, 'Only reserved bookings can be cancelled');
    }

    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new BookingError(404, 'Booking not found');
    }

    await releaseCapacity(tx, booking.parkingLotId);

    await recordEvent(tx, {
      type: 'BOOKING_CANCELLED',
      bookingId: booking.id,
      parkingLotId: booking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      fromStatus: 'RESERVED',
      toStatus: 'CANCELLED',
      reason: 'USER_CANCELLED',
    });
    await recordEvent(tx, {
      type: 'CAPACITY_RELEASED',
      bookingId: booking.id,
      parkingLotId: booking.parkingLotId,
      actorId: userId,
      actorRole: 'USER',
      reason: 'Reservation cancelled by the user.',
    });

    return mapBooking(booking);
  });
}
