import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  prisma,
  resetDb,
  createUser,
  createParkingLot,
  auth,
} from './helpers';

const VEHICLE = 'KA01AB1234';

describe('bookings', () => {
  beforeEach(resetDb);

  async function setup(lotOverrides: Record<string, unknown> = {}) {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, lotOverrides);
    return { owner, user, lot };
  }

  function book(
    token: string,
    parkingLotId: string,
    body: Record<string, unknown> = {},
  ) {
    return request(app)
      .post('/api/bookings')
      .set(auth(token))
      .send({
        parkingLotId,
        vehicleNumber: VEHICLE,
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
    const { user, lot } = await setup();

    const res = await book(user.token, lot.id, { durationMinutes }).expect(201);

    expect(res.body.data.status).toBe('RESERVED');
    expect(res.body.data.vehicleNumber).toBe(VEHICLE);
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
      const { user, lot } = await setup();

      const res = await book(user.token, lot.id, { durationMinutes }).expect(400);

      expect(res.body.message).toBeTruthy();
    },
  );

  it('rejects booking for a missing parking lot', async () => {
    const user = await createUser('user@example.com', 'USER');

    const res = await book(user.token, 'missing-lot-id').expect(404);

    expect(res.body.message).toBe('Parking lot not found');
  });

  it('rejects booking for an inactive lot', async () => {
    const { user, lot } = await setup({ status: 'INACTIVE' });

    const res = await book(user.token, lot.id).expect(409);

    expect(res.body.message).toBe('Parking lot is not active');
  });

  it('rejects booking when no spaces are available', async () => {
    const { user, lot } = await setup({ availableSpaces: 0 });

    const res = await book(user.token, lot.id).expect(409);

    expect(res.body.message).toBe('No parking spaces are available');
  });

  it('decrements available spaces exactly once on booking', async () => {
    const { user, lot } = await setup({ availableSpaces: 3 });

    await book(user.token, lot.id).expect(201);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('prevents overbooking under concurrency (one 201, one 409)', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 1 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');

    const [res1, res2] = await Promise.all([
      book(user1.token, lot.id),
      book(user2.token, lot.id),
    ]);

    expect([res1.status, res2.status].sort()).toEqual([201, 409]);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(0);
  });

  it('rejects overlapping bookings for the same user', async () => {
    const { user, lot } = await setup({ availableSpaces: 5 });

    await book(user.token, lot.id, { durationMinutes: 120 }).expect(201);

    const res = await book(user.token, lot.id, { durationMinutes: 120 }).expect(409);

    expect(res.body.message).toBe('You already have an overlapping parking booking');
  });

  it('allows different users to book when capacity allows', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 2 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');

    await book(user1.token, lot.id).expect(201);
    await book(user2.token, lot.id).expect(201);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(0);
  });

  it('checks in a RESERVED booking', async () => {
    const { user, lot } = await setup();
    const booking = (await book(user.token, lot.id)).body.data;

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.checkInTime).toBeTruthy();
    expect(res.body.data.sessionEndsAt).toBeTruthy();

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(4);
  });

  it('is idempotent when checking in an already-active booking', async () => {
    const { user, lot } = await setup();
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('grants a short check-in window, not the full session, on booking', async () => {
    const { user, lot } = await setup();

    const res = await book(user.token, lot.id, { durationMinutes: 120 }).expect(201);

    const reservedAt = new Date(res.body.data.reservedAt).getTime();
    const checkInDeadline = new Date(res.body.data.checkInDeadline).getTime();
    const windowMinutes = (checkInDeadline - reservedAt) / 60_000;

    expect(windowMinutes).toBeGreaterThan(0);
    expect(windowMinutes).toBeLessThanOrEqual(15);
  });

  it('starts the session timer at check-in, ending at checkInTime + duration', async () => {
    const { user, lot } = await setup();
    const booking = (await book(user.token, lot.id, { durationMinutes: 60 })).body.data;

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    const checkInTime = new Date(res.body.data.checkInTime).getTime();
    const sessionEndsAt = new Date(res.body.data.sessionEndsAt).getTime();
    const sessionMinutes = (sessionEndsAt - checkInTime) / 60_000;

    expect(res.body.data.sessionEndsAt).toBeTruthy();
    expect(Math.round(sessionMinutes)).toBe(60);
  });

  it('rejects check-in of a COMPLETED booking', async () => {
    const { user, lot } = await setup();
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(user.token))
      .expect(200);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(409);

    expect(res.body.message).toBe('Booking cannot be checked in from its current state');
  });

  it('checks out an ACTIVE booking, sets finalAmount, and restores the space', async () => {
    const { user, lot } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.checkOutTime).toBeTruthy();
    expect(typeof res.body.data.finalAmount).toBe('number');

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('does not restore the space twice on repeated check-out', async () => {
    const { user, lot } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(user.token))
      .expect(200);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(user.token))
      .expect(200);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('cancels a RESERVED booking and restores the space', async () => {
    const { user, lot } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id)).body.data;

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(2);
  });

  it('rejects cancelling an ACTIVE booking', async () => {
    const { user, lot } = await setup();
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(user.token))
      .expect(200);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(409);

    expect(res.body.message).toBe('Only reserved bookings can be cancelled');
  });

  it('expires overdue reservations and restores the space exactly once', async () => {
    const { user, lot } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id)).body.data;

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
    const { user, lot } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const booking = (await book(user.token, lot.id)).body.data;

    await request(app).get(`/api/bookings/${booking.id}`).set(auth(other.token)).expect(404);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-in`)
      .set(auth(other.token))
      .expect(404);
    await request(app)
      .post(`/api/bookings/${booking.id}/check-out`)
      .set(auth(other.token))
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

    await book(user1.token, lot.id).expect(201);
    await book(user2.token, lot.id).expect(201);

    const res = await request(app).get('/api/bookings').set(auth(user1.token)).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].parkingLot.id).toBe(lot.id);
  });

  it('requires authentication for booking routes', async () => {
    await request(app).get('/api/bookings').expect(401);
    await request(app).post('/api/bookings').expect(401);
  });
});
