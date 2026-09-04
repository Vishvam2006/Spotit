import { describe, it, expect, beforeEach, vi } from 'vitest';

// Payment is captured up front at reservation time (see payment.service.ts),
// so any booking that ends CANCELLED or EXPIRED without a completed session
// should trigger a Razorpay refund. This intercepts the SDK so we can assert
// on that call without hitting the real gateway.
//
// `vi.mock` factories are hoisted above all imports (and this declaration),
// so `refundMock` has to be created via `vi.hoisted` to exist in time.
const { refundMock } = vi.hoisted(() => ({
  refundMock: vi.fn().mockResolvedValue({ id: 'rfnd_test123', status: 'processed' }),
}));

vi.mock('razorpay', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(function RazorpayMock() {
    return {
      orders: { create: vi.fn() },
      payments: { refund: refundMock },
    };
  }),
}));

import {
  request,
  app,
  prisma,
  resetDb,
  createUser,
  createParkingLot,
  createBooking,
  auth,
} from './helpers';

const VEHICLE = 'KA01AB1234';

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

async function createCapturedPayment(bookingId: string, userId: string, amount = 8000) {
  return prisma.payment.create({
    data: {
      bookingId,
      userId,
      razorpayOrderId: `order_${bookingId}`,
      razorpayPaymentId: `pay_${bookingId}`,
      razorpaySignature: 'sig_test',
      amount,
      status: 'CAPTURED',
    },
  });
}

describe('refunds on cancellation', () => {
  beforeEach(async () => {
    await resetDb();
    refundMock.mockClear();
  });

  it('refunds a user-cancelled booking and marks the payment REFUNDED', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'RESERVED',
      estimatedAmount: 80,
      checkInDeadline: minutesFromNow(15),
    });
    await createCapturedPayment(booking.id, user.user.id, 8000);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.cancellationReason).toBe('USER_CANCELLED');

    expect(refundMock).toHaveBeenCalledTimes(1);
    expect(refundMock).toHaveBeenCalledWith(
      `pay_${booking.id}`,
      expect.objectContaining({ amount: 8000 }),
    );

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe('REFUNDED');
    expect(payment?.razorpayRefundId).toBe('rfnd_test123');
    expect(payment?.refundedAt).not.toBeNull();

    const event = await prisma.continuityEvent.findFirst({
      where: { bookingId: booking.id, type: 'PAYMENT_REFUNDED' },
    });
    expect(event).not.toBeNull();
    expect(event?.reason).toBe('USER_CANCELLED');
  });

  it('does not call Razorpay when the booking has no payment', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'RESERVED',
      estimatedAmount: 80,
      checkInDeadline: minutesFromNow(15),
    });

    await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(refundMock).not.toHaveBeenCalled();
  });

  it('refunds every reservation cancelled when an owner deactivates the lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'RESERVED',
      estimatedAmount: 80,
      checkInDeadline: minutesFromNow(15),
    });
    await createCapturedPayment(booking.id, user.user.id, 8000);

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    expect(res.body.cancelledBookings).toBe(1);
    expect(refundMock).toHaveBeenCalledTimes(1);
    expect(refundMock).toHaveBeenCalledWith(
      `pay_${booking.id}`,
      expect.objectContaining({ amount: 8000 }),
    );

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe('REFUNDED');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe('CANCELLED');
    expect(updatedBooking?.cancellationReason).toBe('PARKING_DEACTIVATED');
  });

  it('refunds a reservation that expired without check-in', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
      checkInDeadline: minutesFromNow(-5),
    });
    await createCapturedPayment(booking.id, user.user.id, 4000);

    // The expiry sweep runs as a side effect of reading bookings.
    const res = await request(app).get('/api/bookings').set(auth(user.token)).expect(200);
    const row = res.body.data.find((b: { id: string }) => b.id === booking.id);
    expect(row.status).toBe('EXPIRED');

    expect(refundMock).toHaveBeenCalledTimes(1);
    expect(refundMock).toHaveBeenCalledWith(
      `pay_${booking.id}`,
      expect.objectContaining({ amount: 4000 }),
    );

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe('REFUNDED');
  });

  it('leaves the payment CAPTURED and logs when the Razorpay refund fails', async () => {
    refundMock.mockRejectedValueOnce(new Error('gateway unreachable'));

    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'RESERVED',
      estimatedAmount: 80,
      checkInDeadline: minutesFromNow(15),
    });
    await createCapturedPayment(booking.id, user.user.id, 8000);

    // The cancellation itself must still succeed even though the refund call
    // throws — a gateway hiccup can never block or reverse a cancellation.
    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe('CAPTURED');
    expect(payment?.razorpayRefundId).toBeNull();
  });
});
