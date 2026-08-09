import { prisma } from '../../config/prisma';
import type { Booking, ParkingLot, Prisma } from '@prisma/client';
import type { CreateBookingInput } from './booking.validation';

export class BookingError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'BookingError';
    this.statusCode = statusCode;
  }
}

const bookingInclude = { parkingLot: true } as const;

export type BookingWithLot = Booking & { parkingLot: ParkingLot };

async function expireReservedBookings(tx: Prisma.TransactionClient) {
  const now = new Date();

  const expired = await tx.booking.findMany({
    where: {
      status: 'RESERVED',
      reservedUntil: { lt: now },
    },
    select: { id: true, parkingLotId: true },
  });

  for (const booking of expired) {
    const result = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: 'RESERVED',
        reservedUntil: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count === 1) {
      await tx.parkingLot.update({
        where: { id: booking.parkingLotId },
        data: { availableSpaces: { increment: 1 } },
      });
    }
  }
}

export async function createBooking(
  userId: string,
  input: CreateBookingInput,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);

    const parkingLot = await tx.parkingLot.findUnique({
      where: { id: input.parkingLotId },
    });

    if (!parkingLot) {
      throw new BookingError(404, 'Parking lot not found');
    }

    if (parkingLot.status !== 'ACTIVE') {
      throw new BookingError(409, 'Parking lot is not active');
    }

    const now = new Date();
    const requestedStart = now;
    const requestedEnd = new Date(now.getTime() + input.durationMinutes * 60_000);

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

    const overlapping = await tx.booking.findFirst({
      where: {
        userId,
        status: { in: ['RESERVED', 'ACTIVE'] },
        startTime: { lt: requestedEnd },
        reservedUntil: { gt: requestedStart },
      },
    });

    if (overlapping) {
      throw new BookingError(409, 'You already have an overlapping parking booking');
    }

    const estimatedAmount = parkingLot.pricePerHour * (input.durationMinutes / 60);

    return tx.booking.create({
      data: {
        userId,
        parkingLotId: parkingLot.id,
        vehicleNumber: input.vehicleNumber,
        startTime: requestedStart,
        reservedUntil: requestedEnd,
        estimatedAmount,
      },
      include: bookingInclude,
    });
  });
}

export async function getBookings(userId: string): Promise<BookingWithLot[]> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);

    return tx.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: bookingInclude,
    });
  });
}

export async function getBookingById(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    await expireReservedBookings(tx);

    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new BookingError(404, 'Booking not found');
    }

    return booking;
  });
}

export async function checkInBooking(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        userId,
        status: 'RESERVED',
        reservedUntil: { gt: now },
      },
      data: { status: 'ACTIVE', checkInTime: now },
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
        return booking;
      }

      throw new BookingError(409, 'Booking cannot be checked in from its current state');
    }

    return tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    }) as Promise<BookingWithLot>;
  });
}

export async function checkOutBooking(
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
      return tx.booking.findFirst({
        where: { id: bookingId, userId },
        include: bookingInclude,
      }) as Promise<BookingWithLot>;
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

    await tx.parkingLot.update({
      where: { id: existing.parkingLotId },
      data: { availableSpaces: { increment: 1 } },
    });

    return updatedBooking;
  });
}

export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<BookingWithLot> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, userId, status: 'RESERVED' },
      data: { status: 'CANCELLED' },
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

    const booking = (await tx.booking.findFirst({
      where: { id: bookingId, userId },
      include: bookingInclude,
    })) as BookingWithLot;

    await tx.parkingLot.update({
      where: { id: booking.parkingLotId },
      data: { availableSpaces: { increment: 1 } },
    });

    return booking;
  });
}
