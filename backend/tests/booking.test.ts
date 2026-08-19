import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  prisma,
  resetDb,
  createUser,
  createParkingLot,
  createVehicleRecord,
  auth,
  atLot,
  completeCheckIn,
  completeCheckOut,
} from './helpers';

const VEHICLE = 'KA01AB1234';

describe('bookings', () => {
  beforeEach(resetDb);

  async function setup(lotOverrides: Record<string, unknown> = {}) {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, lotOverrides);
    const vehicle = await createVehicleRecord(user.user.id, { registration: VEHICLE });
    return { owner, user, lot, vehicle };
  }

  function book(
    token: string,
    parkingLotId: string,
    vehicleId: string,
    body: Record<string, unknown> = {},
  ) {
    return request(app)
      .post('/api/bookings')
      .set(auth(token))
      .send({
        parkingLotId,
        vehicleId,
        durationMinutes: 120,
        ...body,
      });
  }

  it.each([
    [60, 40],
    [120, 80],
    [240, 160],
    [480, 320],
  ])('creates a RESERVED booking for %s minutes', async (durationMinutes, expectedAmount) => {
    const { user, lot, vehicle } = await setup();

    const res = await book(user.token, lot.id, vehicle.id, { durationMinutes }).expect(201);

    expect(res.body.data.status).toBe('RESERVED');
    expect(res.body.data.vehicleNumber).toBe(VEHICLE);
    expect(res.body.data.vehicle.registration).toBe(VEHICLE);
    expect(res.body.data.vehicle.type).toBe('FOUR_WHEELER');
    expect(res.body.data.vehicle.id).toBe(vehicle.id);
    expect(res.body.data.durationMinutes).toBe(durationMinutes);
    expect(res.body.data.estimatedAmount).toBe(expectedAmount);
    expect(res.body.data.reservedAt).toBeTruthy();
    expect(res.body.data.checkInDeadline).toBeTruthy();
    expect(res.body.data.checkInTime).toBeNull();
    expect(res.body.data.sessionEndsAt).toBeNull();
  });

  it.each([30, 500, 90.5, Number.NaN])(
    'rejects invalid durationMinutes %s',
    async (durationMinutes) => {
      const { user, lot, vehicle } = await setup();

      const res = await book(user.token, lot.id, vehicle.id, { durationMinutes }).expect(400);

      expect(res.body.message).toBeTruthy();
    },
  );

  it('rejects booking without a vehicle', async () => {
    const { user, lot } = await setup();

    const res = await request(app)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({ parkingLotId: lot.id, durationMinutes: 120 })
      .expect(400);

    expect(res.body.message).toBeTruthy();
  });

  it('rejects booking with another user\'s vehicle', async () => {
    const { user, lot } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const otherVehicle = await createVehicleRecord(other.user.id, {
      registration: 'GJ01AB9999',
    });

    const res = await book(user.token, lot.id, otherVehicle.id).expect(404);

    expect(res.body.message).toBe('Vehicle not found');
  });

  it('rejects booking for a missing parking lot', async () => {
    const user = await createUser('user@example.com', 'USER');
    const vehicle = await createVehicleRecord(user.user.id);

    const res = await book(user.token, 'missing-lot-id', vehicle.id).expect(404);

    expect(res.body.message).toBe('Parking lot not found');
  });

  it("rejects an owner from booking their own parking spot", async () => {
    const { owner, lot } = await setup();
    const ownerVehicle = await createVehicleRecord(owner.user.id, {
      registration: 'KA05ZZ7788',
    });

    const res = await book(owner.token, lot.id, ownerVehicle.id).expect(409);

    expect(res.body.message).toBe('You cannot book your own parking spot');
  });

  it("still allows another user to book the owner's parking spot", async () => {
    const { user, lot, vehicle } = await setup();

    const res = await book(user.token, lot.id, vehicle.id).expect(201);

    expect(res.body.data.status).toBe('RESERVED');
  });

  it('rejects booking for an inactive lot', async () => {
    const { user, lot, vehicle } = await setup({ status: 'INACTIVE' });

    const res = await book(user.token, lot.id, vehicle.id).expect(409);

    expect(res.body.message).toBe('Parking lot is not active');
  });

  describe('vehicle verification gate', () => {
    it('refuses to book with a vehicle that was never verified', async () => {
      const { user, lot } = await setup();
      const vehicle = await createVehicleRecord(user.user.id, {
        registration: 'KA09ZZ0001',
        verificationStatus: null,
      });

      const res = await book(user.token, lot.id, vehicle.id).expect(403);
      expect(res.body.message).toMatch(/verify this vehicle/i);
    });

    it('refuses while verification is still under review', async () => {
      const { user, lot } = await setup();
      const vehicle = await createVehicleRecord(user.user.id, {
        registration: 'KA09ZZ0002',
        verificationStatus: 'NEEDS_REVIEW',
      });

      const res = await book(user.token, lot.id, vehicle.id).expect(403);
      expect(res.body.message).toMatch(/still being verified/i);
    });

    it('refuses a vehicle whose documents were rejected', async () => {
      const { user, lot } = await setup();
      const vehicle = await createVehicleRecord(user.user.id, {
        registration: 'KA09ZZ0003',
        verificationStatus: 'REJECTED',
      });

      const res = await book(user.token, lot.id, vehicle.id).expect(403);
      expect(res.body.message).toMatch(/failed document verification/i);
    });

    it('holds no space when the vehicle is refused', async () => {
      const { user, lot } = await setup({ availableSpaces: 2 });
      const vehicle = await createVehicleRecord(user.user.id, {
        registration: 'KA09ZZ0004',
        verificationStatus: null,
      });

      await book(user.token, lot.id, vehicle.id).expect(403);

      // The guard runs before the decrement, so a rejected attempt must not
      // leave the lot one space short.
      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.availableSpaces).toBe(2);
    });

    it('blocks a verified vehicle that was re-plated after approval', async () => {
      const { user, lot, vehicle } = await setup();

      // Editing the registration clears the stamp, so the old approval cannot
      // be carried onto a different number plate.
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { registration: 'KA09ZZ0005', verificationStatus: null, verifiedAt: null },
      });

      await book(user.token, lot.id, vehicle.id).expect(403);
    });
  });

  it('rejects booking when no spaces are available', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 0 });

    const res = await book(user.token, lot.id, vehicle.id).expect(409);

    expect(res.body.message).toBe('No parking spaces are available');
  });

  it('decrements available spaces exactly once on booking', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 3 });

    await book(user.token, lot.id, vehicle.id).expect(201);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('prevents overbooking under concurrency (one 201, one 409)', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 1 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');
    const vehicle1 = await createVehicleRecord(user1.user.id);
    const vehicle2 = await createVehicleRecord(user2.user.id, { registration: 'KA02XY5678' });

    const [res1, res2] = await Promise.all([
      book(user1.token, lot.id, vehicle1.id),
      book(user2.token, lot.id, vehicle2.id),
    ]);

    expect([res1.status, res2.status].sort()).toEqual([201, 409]);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(0);
  });

  it('rejects overlapping bookings for the same user', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 5 });

    await book(user.token, lot.id, vehicle.id, { durationMinutes: 120 }).expect(201);

    const res = await book(user.token, lot.id, vehicle.id, { durationMinutes: 120 }).expect(409);

    expect(res.body.message).toBe('You already have an overlapping parking booking');
  });

  it('allows different users to book when capacity allows', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 2 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');
    const vehicle1 = await createVehicleRecord(user1.user.id);
    const vehicle2 = await createVehicleRecord(user2.user.id, { registration: 'KA02XY5678' });

    await book(user1.token, lot.id, vehicle1.id).expect(201);
    await book(user2.token, lot.id, vehicle2.id).expect(201);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(0);
  });

  it('checks in a RESERVED booking', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(4);
  });

  it('is idempotent when checking in an already-active booking', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .send(atLot())
      .expect(200);

    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('grants a short check-in window, not the full session, on booking', async () => {
    const { user, lot, vehicle } = await setup();

    const res = await book(user.token, lot.id, vehicle.id, { durationMinutes: 120 }).expect(201);

    const reservedAt = new Date(res.body.data.reservedAt).getTime();
    const checkInDeadline = new Date(res.body.data.checkInDeadline).getTime();
    const windowMinutes = (checkInDeadline - reservedAt) / 60_000;

    expect(windowMinutes).toBeGreaterThan(0);
    expect(windowMinutes).toBeLessThanOrEqual(15);
  });

  it('starts the session timer at check-in, ending at checkInTime + duration', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id, { durationMinutes: 60 })).body.data;

    const active = await completeCheckIn(user.token, booking.id);

    const checkInTime = new Date(active.checkInTime).getTime();
    const sessionEndsAt = new Date(active.sessionEndsAt).getTime();
    const sessionMinutes = (sessionEndsAt - checkInTime) / 60_000;

    expect(active.sessionEndsAt).toBeTruthy();
    expect(Math.round(sessionMinutes)).toBe(60);
  });

  it('rejects check-in of a COMPLETED booking', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInTime: new Date(Date.now() - 181_000) },
    });
    await completeCheckOut(user.token, booking.id);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .send(atLot())
      .expect(409);

    expect(res.body.message).toBe('Booking cannot be checked in from its current state');
  });

  it('checks out an ACTIVE booking, sets finalAmount, and restores the space', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInTime: new Date(Date.now() - 181_000) },
    });

    const res = await completeCheckOut(user.token, booking.id);

    expect(res.status).toBe('COMPLETED');
    expect(res.checkOutTime).toBeTruthy();
    expect(typeof res.finalAmount).toBe('number');

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('does not restore the space twice on repeated check-out', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInTime: new Date(Date.now() - 181_000) },
    });
    await completeCheckOut(user.token, booking.id);

    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(user.token))
      .send(atLot())
      .expect(200);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('cancels a RESERVED booking and restores the space', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.cancellationReason).toBe('USER_CANCELLED');
    expect(res.body.data.cancelledAt).toBeTruthy();

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('rejects cancelling an ACTIVE booking', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await completeCheckIn(user.token, booking.id);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(409);

    expect(res.body.message).toBe('Only reserved bookings can be cancelled');
  });

  it('expires overdue reservations and restores the space exactly once', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    const past = new Date(Date.now() - 60_000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reservedAt: past, checkInDeadline: past },
    });

    const res1 = await request(app).get('/api/bookings').set(auth(user.token)).expect(200);
    const expired = res1.body.data.find((b: { id: string }) => b.id === booking.id);
    expect(expired.status).toBe('EXPIRED');

    const afterFirst = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(afterFirst?.availableSpaces).toBe(2);

    await request(app).get('/api/bookings').set(auth(user.token)).expect(200);

    const afterSecond = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(afterSecond?.availableSpaces).toBe(2);
  });

  it('prevents a user from accessing another user\'s booking', async () => {
    const { user, lot, vehicle } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const booking = (await book(user.token, lot.id, vehicle.id)).body.data;

    await request(app).get(`/api/bookings/${booking.id}`).set(auth(other.token)).expect(404);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(other.token))
      .send(atLot())
      .expect(404);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(other.token))
      .send(atLot())
      .expect(404);
    await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(other.token))
      .expect(404);
  });

  it('lists only the current user\'s bookings', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');
    const vehicle1 = await createVehicleRecord(user1.user.id);
    const vehicle2 = await createVehicleRecord(user2.user.id, { registration: 'KA02XY5678' });

    await book(user1.token, lot.id, vehicle1.id).expect(201);
    await book(user2.token, lot.id, vehicle2.id).expect(201);

    const res = await request(app).get('/api/bookings').set(auth(user1.token)).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].parkingLot.id).toBe(lot.id);
    expect(res.body.data[0].vehicle.registration).toBe(vehicle1.registration);
  });

  it('requires authentication for booking routes', async () => {
    await request(app).get('/api/bookings').expect(401);
    await request(app).post('/api/bookings').expect(401);
  });
});
