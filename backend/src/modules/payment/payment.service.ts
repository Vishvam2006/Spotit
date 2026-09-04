import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import * as bookingService from '../booking/booking.service';
import * as reassignmentService from '../reassignment/reassignment.service';
import { recordEvent } from '../continuity/continuity.events';
import type { CreateOrderInput, VerifyPaymentInput, VerifyReassignmentPaymentInput } from './payment.validation';
import type { BookingWithLot } from '../booking/booking.service';

export class PaymentError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = statusCode;
  }
}

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn(
    '[Payment] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. Payment features will fail at runtime.',
  );
}

const razorpay = new Razorpay({
  key_id: keyId ?? '',
  key_secret: keySecret ?? '',
});

/**
 * Create a Razorpay order for a parking booking.
 *
 * This does NOT create a booking yet — it only:
 *  1. Validates the parking lot exists and is bookable
 *  2. Calculates the estimated amount
 *  3. Creates a Razorpay order
 *  4. Stores a Payment row (status: CREATED) so we can verify later
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<{
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  parkingLotName: string;
}> {
  const parkingLot = await prisma.parkingLot.findUnique({
    where: { id: input.parkingLotId },
  });

  if (!parkingLot) {
    throw new PaymentError(404, 'Parking lot not found');
  }

  if (parkingLot.status !== 'ACTIVE') {
    throw new PaymentError(409, 'Parking lot is not currently accepting bookings');
  }

  if (parkingLot.availableSpaces <= 0) {
    throw new PaymentError(409, 'No parking spaces are available');
  }

  if (parkingLot.ownerId === userId) {
    throw new PaymentError(409, 'You cannot book your own parking spot');
  }

  // Amount in paise (INR smallest unit). Round to avoid floating-point drift.
  const estimatedRupees = parkingLot.pricePerHour * (input.durationMinutes / 60);
  const amountPaise = Math.round(estimatedRupees * 100);

  if (amountPaise < 100) {
    // Razorpay minimum order is ₹1
    throw new PaymentError(400, 'Order amount is too small');
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `spotit_${Date.now()}`,
    notes: {
      parkingLotId: input.parkingLotId,
      vehicleId: input.vehicleId,
      durationMinutes: String(input.durationMinutes),
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      userId,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      status: 'CREATED',
    },
  });

  return {
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: keyId!,
    parkingLotName: parkingLot.name,
  };
}

/**
 * Verify the Razorpay payment signature, then create the booking.
 *
 * Razorpay signs `order_id|payment_id` with the key secret using HMAC-SHA256.
 * If the signature matches, the payment is authentic and we can safely create
 * the booking and link it to the Payment row.
 */
export async function verifyAndBook(
  userId: string,
  input: VerifyPaymentInput,
): Promise<{ booking: BookingWithLot; payment: { razorpayPaymentId: string; amount: number; status: string } }> {
  // 1. Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', keySecret!)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== input.razorpaySignature) {
    // Mark the payment as failed
    await prisma.payment.updateMany({
      where: { razorpayOrderId: input.razorpayOrderId },
      data: { status: 'FAILED' },
    });
    throw new PaymentError(400, 'Payment verification failed. The payment signature is invalid.');
  }

  // 2. Check that this order hasn't already been used
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (!existingPayment) {
    throw new PaymentError(404, 'Payment order not found');
  }

  if (existingPayment.userId !== userId) {
    throw new PaymentError(403, 'Payment does not belong to you');
  }

  if (existingPayment.status === 'CAPTURED' && existingPayment.bookingId) {
    throw new PaymentError(409, 'This payment has already been used for a booking');
  }

  // 3. Create the booking using the existing booking service
  const booking = await bookingService.createBooking(userId, {
    parkingLotId: input.parkingLotId,
    vehicleId: input.vehicleId,
    durationMinutes: input.durationMinutes,
  });

  // 4. Link the payment to the booking and mark as captured
  const updatedPayment = await prisma.payment.update({
    where: { razorpayOrderId: input.razorpayOrderId },
    data: {
      bookingId: booking.id,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      status: 'CAPTURED',
    },
  });

  return {
    booking,
    payment: {
      razorpayPaymentId: updatedPayment.razorpayPaymentId!,
      amount: updatedPayment.amount,
      status: updatedPayment.status,
    },
  };
}

/**
 * Refunds the captured payment behind a single booking, if one exists.
 *
 * Payment is captured up front at reservation time (see `verifyAndBook`
 * above), so any booking that ends in CANCELLED or EXPIRED without ever
 * being checked in has money sitting with Razorpay and nothing to show for
 * it. This is the one place that unwinds that — called after cancellation,
 * never as part of it: cancelling a booking must never fail or roll back
 * because the payment gateway is slow or down, so the gateway call always
 * happens after the booking's own transaction has already committed.
 *
 * Best-effort: a Razorpay failure is logged, not thrown. The Payment row is
 * left at CAPTURED so it's easy to find and retry/reconcile manually; the
 * booking's own cancellation already succeeded and stands regardless.
 */
export async function refundBookingPayment(
  bookingId: string,
  reason: string,
): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });

  if (!payment || payment.status !== 'CAPTURED' || !payment.razorpayPaymentId) {
    return;
  }

  try {
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount,
      speed: 'normal',
      notes: { bookingId, reason },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        razorpayRefundId: refund.id,
        refundedAt: new Date(),
      },
    });

    await recordEvent(prisma, {
      type: 'PAYMENT_REFUNDED',
      bookingId,
      reason,
      metadata: { amount: payment.amount, razorpayRefundId: refund.id },
    });
  } catch (error) {
    console.error(`[Payment] Failed to refund booking ${bookingId}:`, error);
  }
}

/**
 * Refunds a batch of bookings cancelled together (e.g. every RESERVED
 * booking on a lot an owner just deactivated, or a sweep of expired
 * reservations). Sequential and per-booking best-effort, so one failure
 * never stops the rest from being refunded.
 */
export async function refundBookingPayments(
  bookingIds: string[],
  reason: string,
): Promise<void> {
  for (const bookingId of bookingIds) {
    await refundBookingPayment(bookingId, reason);
  }
}

/**
 * Creates a Razorpay order for a held reassignment offer. No booking has a
 * captured payment attached yet -- the Payment row (status CREATED) is only
 * linked to the candidate booking once /verify succeeds, exactly like the
 * normal booking flow's createOrder/verifyAndBook pair above.
 */
export async function createReassignmentOrder(
  userId: string,
  reassignmentId: string,
): Promise<{
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  parkingLotName: string;
}> {
  const offer = await reassignmentService.getReassignmentOwnedByUser(userId, reassignmentId);

  if (offer.status !== 'PENDING') {
    throw new PaymentError(
      409,
      `This offer is ${offer.status.toLowerCase().replace('_', ' ')} and cannot be paid for.`,
    );
  }

  if (offer.decisionDeadline && offer.decisionDeadline.getTime() < Date.now()) {
    // Server-side deadline check -- the frontend countdown is a display
    // convenience only and is never trusted for correctness.
    throw new PaymentError(409, 'This offer has expired.');
  }

  if (!offer.candidateBookingId) {
    throw new PaymentError(409, 'This offer has no held booking to pay for.');
  }

  const candidateBooking = await prisma.booking.findUnique({
    where: { id: offer.candidateBookingId },
    include: { parkingLot: true },
  });

  if (!candidateBooking) {
    throw new PaymentError(404, 'Held booking not found');
  }

  const estimatedRupees =
    candidateBooking.parkingLot.pricePerHour * (candidateBooking.durationMinutes / 60);
  const amountPaise = Math.round(estimatedRupees * 100);

  if (amountPaise < 100) {
    throw new PaymentError(400, 'Order amount is too small');
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `spotit_reassign_${Date.now()}`,
    notes: {
      reassignmentId,
      candidateBookingId: candidateBooking.id,
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      userId,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      status: 'CREATED',
    },
  });

  return {
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: keyId!,
    parkingLotName: candidateBooking.parkingLot.name,
  };
}

/**
 * Verifies payment for a reassignment offer. Covers two distinct cases that
 * both end up here:
 *
 *  - Explicit accept: the offer is still PENDING, so this call also performs
 *    the PENDING -> ACCEPTED transition (via reassignmentService.accept,
 *    which is what actually decides the race against the auto-accept
 *    sweeper -- this function never assumes it "won").
 *  - Deferred payment: the offer already auto-accepted at the 5-minute
 *    timeout, the candidate booking is already RESERVED, and this call only
 *    captures the payment the sweeper pre-created for it.
 *
 * If the offer resolved to anything else (e.g. DECLINED), payment is
 * refused -- there is no booking left to attach it to.
 */
export async function verifyReassignmentPayment(
  userId: string,
  reassignmentId: string,
  input: VerifyReassignmentPaymentInput,
): Promise<{
  booking: BookingWithLot;
  payment: { razorpayPaymentId: string; amount: number; status: string };
}> {
  const expectedSignature = crypto
    .createHmac('sha256', keySecret!)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== input.razorpaySignature) {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: input.razorpayOrderId },
      data: { status: 'FAILED' },
    });
    throw new PaymentError(400, 'Payment verification failed. The payment signature is invalid.');
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (!payment) {
    throw new PaymentError(404, 'Payment order not found');
  }

  if (payment.userId !== userId) {
    throw new PaymentError(403, 'Payment does not belong to you');
  }

  if (payment.status === 'CAPTURED') {
    throw new PaymentError(409, 'This payment has already been captured');
  }

  const offer = await reassignmentService.getReassignmentOwnedByUser(userId, reassignmentId);
  let candidateBookingId = offer.candidateBookingId;

  if (offer.status === 'PENDING') {
    const accepted = await reassignmentService.acceptReassignment(userId, reassignmentId);
    candidateBookingId = accepted.id;
  } else if (offer.status === 'AUTO_ACCEPTED') {
    if (!candidateBookingId || (payment.bookingId && payment.bookingId !== candidateBookingId)) {
      throw new PaymentError(409, 'This payment does not match the reserved booking.');
    }
  } else {
    throw new PaymentError(
      409,
      `This offer is ${offer.status.toLowerCase().replace('_', ' ')} and cannot be paid for.`,
    );
  }

  if (!candidateBookingId) {
    throw new PaymentError(404, 'Candidate booking not found for this offer.');
  }

  const updatedPayment = await prisma.payment.update({
    where: { razorpayOrderId: input.razorpayOrderId },
    data: {
      bookingId: candidateBookingId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      status: 'CAPTURED',
    },
  });

  const booking = await bookingService.getBookingById(userId, candidateBookingId);

  return {
    booking,
    payment: {
      razorpayPaymentId: updatedPayment.razorpayPaymentId!,
      amount: updatedPayment.amount,
      status: updatedPayment.status,
    },
  };
}

/**
 * Called by reassignmentSweeper.ts right after a held offer auto-accepts.
 * There is no live Checkout session to capture against at timeout -- this
 * pre-creates the order + an uncaptured Payment row (status CREATED) so the
 * booking's RESERVED + Payment:CREATED combination is the signal the
 * frontend uses to show a "complete payment to keep this spot" banner. The
 * Razorpay call happens after the caller's own transaction has committed,
 * for the same reason every other payment-adjacent call in this codebase
 * runs outside the DB transaction: it is slow, external, and must never
 * hold a row lock or risk rolling back a state change that already took
 * effect.
 */
export async function createUncapturedOrderForBooking(booking: BookingWithLot): Promise<void> {
  const estimatedRupees = booking.parkingLot.pricePerHour * (booking.durationMinutes / 60);
  const amountPaise = Math.round(estimatedRupees * 100);

  if (amountPaise < 100) {
    return;
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `spotit_reassign_auto_${Date.now()}`,
    notes: {
      bookingId: booking.id,
      userId: booking.userId,
      reason: 'REASSIGNMENT_AUTO_ACCEPTED',
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      userId: booking.userId,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      status: 'CREATED',
    },
  });
}
