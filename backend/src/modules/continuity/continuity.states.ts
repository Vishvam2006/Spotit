import type { BookingStatus, ParkingLotStatus } from '@prisma/client';

/**
 * The booking state machine at the heart of the Continuity Engine.
 *
 * Naming note: the spec for this engine calls the "space is held for you"
 * state CONFIRMED. ParkMitra already shipped that state as RESERVED, in the
 * database, the API and the UI, so RESERVED *is* CONFIRMED here. There is no
 * PENDING/PAYMENT_FAILED pair because bookings are not paid for up front —
 * a booking is either created (and holding a space) or it failed to be
 * created at all.
 *
 * Every transition the engine performs is checked against this table, so an
 * illegal jump (say COMPLETED -> ACTIVE) fails loudly instead of silently
 * corrupting a booking's history.
 */
const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  RESERVED: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'DISPUTED'],
  ACTIVE: ['COMPLETED', 'DISPUTED'],
  // Terminal states. DISPUTED is deliberately terminal: the booking is frozen
  // as evidence, and resolving the case updates the *report*, never the
  // booking, so the record of what the user experienced cannot be rewritten.
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: [],
};

/** Statuses in which the booking still holds a space in the lot's counter. */
const CAPACITY_HOLDING_STATUSES: readonly BookingStatus[] = ['RESERVED', 'ACTIVE'];

/** Statuses a user may still report an issue against. */
const REPORTABLE_STATUSES: readonly BookingStatus[] = [
  'RESERVED',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
];

export class ContinuityError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ContinuityError';
    this.statusCode = statusCode;
  }
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/**
 * Guards a booking transition. Throws a 409 rather than returning false so a
 * caller can never accidentally ignore an illegal transition.
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (from === to) {
    throw new ContinuityError(409, `Booking is already ${to.toLowerCase()}.`);
  }

  if (!canTransition(from, to)) {
    throw new ContinuityError(
      409,
      `A booking cannot move from ${from} to ${to}.`,
    );
  }
}

/**
 * Whether a booking is still live enough to be frozen as evidence.
 *
 * A RESERVED or ACTIVE booking is: the session is unfinished, so freezing it is
 * what protects the user. A COMPLETED or EXPIRED one is not — the session is
 * already over, and overwriting its status would erase the record of what
 * actually happened, which is the one thing this engine exists to keep. Those
 * bookings can still be reported; the report simply files against the lot
 * without rewriting the booking.
 */
export function isDisputable(status: BookingStatus): boolean {
  return canTransition(status, 'DISPUTED');
}

export function holdsCapacity(status: BookingStatus): boolean {
  return CAPACITY_HOLDING_STATUSES.includes(status);
}

export function isReportable(status: BookingStatus): boolean {
  return REPORTABLE_STATUSES.includes(status);
}

/**
 * Lot statuses the engine is allowed to escalate from. A lot the owner already
 * took down (INACTIVE/CLOSED) is left alone — there is nothing to protect
 * users from, and overwriting it would lose the owner's intent.
 */
export function isEscalatable(status: ParkingLotStatus): boolean {
  return status === 'ACTIVE';
}
