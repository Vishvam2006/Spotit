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
} from './helpers';

const VEHICLE = 'KA01AB1234';
const LOT_LAT = 12.9756;
const LOT_LNG = 77.6068;

function locationSample(
  lat: number,
  lng: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    lat,
    lng,
    accuracy: 10,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function atLot(overrides: Record<string, unknown> = {}) {
  return locationSample(LOT_LAT, LOT_LNG, overrides);
}

function farFromLot(metersAway = 500) {
  const offset = metersAway / 111_000;
  return locationSample(LOT_LAT + offset, LOT_LNG + offset);
}

function nearAdjacentLot() {
  return locationSample(LOT_LAT + 0.001, LOT_LNG + 0.001);
}

async function setup(lotOverrides: Record<string, unknown> = {}) {
  const owner = await createUser('owner@example.com', 'OWNER');
  const user = await createUser('user@example.com', 'USER');
  const lot = await createParkingLot(owner.token, {
    latitude: LOT_LAT,
    longitude: LOT_LNG,
    ...lotOverrides,
  });
  const vehicle = await createVehicleRecord(user.user.id, { registration: VEHICLE });
  return { owner, user, lot, vehicle };
}

function book(token: string, parkingLotId: string, vehicleId: string) {
  return request(app)
    .post('/api/bookings')
    .set(auth(token))
    .send({ parkingLotId, vehicleId, durationMinutes: 120 });
}

async function checkIn(token: string, bookingId: string, sample?: object) {
  return request(app)
    .post(`/api/bookings/${bookingId}/check-in`)
    .set(auth(token))
    .send(sample ?? {});
}

async function checkOut(token: string, bookingId: string, sample?: object) {
  return request(app)
    .post(`/api/bookings/${bookingId}/check-out`)
    .set(auth(token))
    .send(sample ?? {});
}

async function completeCheckIn(token: string, bookingId: string) {
  const first = await checkIn(token, bookingId, atLot());
  expect(first.status).toBe(202);

  const second = await checkIn(
    token,
    bookingId,
    atLot({
      capturedAt: new Date(Date.now() + 31_000).toISOString(),
    }),
  );
  expect(second.status).toBe(200);
  expect(second.body.data.status).toBe('ACTIVE');
  return second.body.data;
}

async function completeCheckOut(token: string, bookingId: string) {
  const outside = farFromLot(500);
  for (let i = 0; i < 3; i++) {
    const res = await checkOut(token, bookingId, {
      ...outside,
      capturedAt: new Date(Date.now() + i * 1000).toISOString(),
    });
    if (i < 2) {
      expect(res.status).toBe(202);
    }
  }
  const final = await checkOut(token, bookingId, {
    ...outside,
    capturedAt: new Date(Date.now() + 181_000).toISOString(),
  });
  expect(final.status).toBe(200);
  expect(final.body.data.status).toBe('COMPLETED');
  return final.body.data;
}

describe('QA Audit — End-to-end journey', () => {
  beforeEach(resetDb);

  it('completes register → book → check-in → check-out → history', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 3 });

    const bookingRes = await book(user.token, lot.id, vehicle.id).expect(201);
    const bookingId = bookingRes.body.data.id;
    expect(bookingRes.body.data.status).toBe('RESERVED');

    const lotAfterBook = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotAfterBook?.availableSpaces).toBe(2);

    await completeCheckIn(user.token, bookingId);

    const lotDuringActive = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotDuringActive?.availableSpaces).toBe(2);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { checkInTime: new Date(Date.now() - 181_000) },
    });

    await completeCheckOut(user.token, bookingId);

    const lotAfterCheckout = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotAfterCheckout?.availableSpaces).toBe(3);

    const history = await request(app)
      .get('/api/bookings')
      .set(auth(user.token))
      .expect(200);
    const completed = history.body.data.find((b: { id: string }) => b.id === bookingId);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.finalAmount).toBeTypeOf('number');
  });
});

describe('QA Audit — Check-in verification', () => {
  beforeEach(resetDb);

  it('rejects check-in without location when geofence enabled', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location data is invalid.');

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('RESERVED');
  });

  it('rejects location outside parking radius', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, farFromLot(500));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location is too far from the parking lot.');
  });

  it('rejects stale location timestamp', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(
      user.token,
      booking.id,
      atLot({ capturedAt: new Date(Date.now() - 120_000).toISOString() }),
    );
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location reading is stale.');
  });

  it('rejects poor accuracy', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, atLot({ accuracy: 100 }));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location accuracy is too low.');
  });

  it('rejects impossible speed', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, atLot({ speedMps: 50 }));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location data is invalid.');
  });

  it('rejects future timestamp via validation (missing sample)', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, {
      lat: LOT_LAT,
      lng: LOT_LNG,
      accuracy: 10,
      capturedAt: 'not-a-datetime',
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location data is invalid.');
  });

  it('returns 202 until dwell time and reading count met', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res1 = await checkIn(user.token, booking.id, atLot());
    expect(res1.status).toBe(202);

    const res2 = await checkIn(user.token, booking.id, atLot());
    expect(res2.status).toBe(202);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('RESERVED');
  });

  it('is idempotent once ACTIVE', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    const res = await checkIn(user.token, booking.id, atLot());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('rejects check-in after expiry', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInDeadline: new Date(Date.now() - 1000) },
    });

    const res = await checkIn(user.token, booking.id, atLot());
    expect(res.status).toBe(409);
  });

  it('rejects check-in after cancellation', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    const res = await checkIn(user.token, booking.id, atLot());
    expect(res.status).toBe(409);
  });

  it('rejects check-in from wrong parking lot coordinates', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, locationSample(23.0225, 72.5714));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Location is too far from the parking lot.');
  });

  it('rejects adjacent-road location outside radius', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(user.token, booking.id, nearAdjacentLot());
    expect([202, 409]).toContain(res.status);
  });

  it('audits rejected check-in attempts', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await checkIn(user.token, booking.id, farFromLot(500));

    const audits = await prisma.locationAudit.findMany({
      where: { bookingId: booking.id, eventType: 'CHECK_IN_READING' },
    });
    expect(audits.length).toBe(1);
    expect(audits[0].accepted).toBe(false);
  });
});

describe('QA Audit — Check-out verification', () => {
  beforeEach(resetDb);

  async function activeBooking() {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkInTime: new Date(Date.now() - 181_000) },
    });
    return { user, lot, booking };
  }

  it('rejects checkout while still inside lot', async () => {
    const { user, booking } = await activeBooking();

    const res = await checkOut(user.token, booking.id, atLot());
    expect(res.status).toBe(202);
    expect(res.body.message).toContain('still inside');

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('ACTIVE');
  });

  it('requires multiple outside readings', async () => {
    const { user, booking } = await activeBooking();
    const outside = farFromLot(500);

    const res1 = await checkOut(user.token, booking.id, outside);
    expect(res1.status).toBe(202);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('ACTIVE');
  });

  it('rejects checkout before grace period', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    const outside = farFromLot(500);
    for (let i = 0; i < 3; i++) {
      await checkOut(user.token, booking.id, {
        ...outside,
        capturedAt: new Date(Date.now() + i * 1000).toISOString(),
      });
    }

    const res = await checkOut(user.token, booking.id, outside);
    expect(res.status).toBe(202);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('ACTIVE');
  });

  it('does not restore capacity twice on repeated checkout', async () => {
    const { user, lot, booking } = await activeBooking();
    const spacesBefore = (await prisma.parkingLot.findUnique({ where: { id: lot.id } }))
      ?.availableSpaces;

    await completeCheckOut(user.token, booking.id);
    const repeated = await checkOut(user.token, booking.id, farFromLot(500));
    expect(repeated.status).toBe(200);

    const spacesAfter = (await prisma.parkingLot.findUnique({ where: { id: lot.id } }))
      ?.availableSpaces;
    expect(spacesAfter).toBe((spacesBefore ?? 0) + 1);
  });

  it('ignores client-provided final amount (backend calculates)', async () => {
    const { user, lot, booking } = await activeBooking();
    await completeCheckOut(user.token, booking.id);

    const completed = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(completed?.finalAmount).toBeTypeOf('number');
    expect(completed?.finalAmount).toBeGreaterThanOrEqual(0);
  });

  it('rejects stale outside location for checkout', async () => {
    const { user, booking } = await activeBooking();

    const res = await checkOut(user.token, booking.id, {
      ...farFromLot(500),
      capturedAt: new Date(Date.now() - 120_000).toISOString(),
    });
    expect(res.status).toBe(202);
  });
});

describe('QA Audit — Booking and capacity loopholes', () => {
  beforeEach(resetDb);

  it('prevents double-booking last space under concurrency', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 1 });
    const user1 = await createUser('u1@example.com', 'USER');
    const user2 = await createUser('u2@example.com', 'USER');
    const vehicle1 = await createVehicleRecord(user1.user.id, { registration: 'KA01AB1234' });
    const vehicle2 = await createVehicleRecord(user2.user.id, { registration: 'KA02XY5678' });

    const [res1, res2] = await Promise.all([
      book(user1.token, lot.id, vehicle1.id),
      book(user2.token, lot.id, vehicle2.id),
    ]);
    expect([res1.status, res2.status].sort()).toEqual([201, 409]);

    const updated = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(updated?.availableSpaces).toBe(0);
  });

  it('does not decrement capacity when an overlapping booking is rejected', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 5 });
    await book(user.token, lot.id, vehicle.id).expect(201);

    const before = (await prisma.parkingLot.findUnique({ where: { id: lot.id } }))
      ?.availableSpaces;

    const res = await book(user.token, lot.id, vehicle.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You already have an overlapping parking booking');

    const after = (await prisma.parkingLot.findUnique({ where: { id: lot.id } }))
      ?.availableSpaces;
    expect(after).toBe(before);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('rejects duplicate cancel', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token));
    expect(res.status).toBe(409);

    const lotAfter = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotAfter?.availableSpaces).toBe(2);
  });

  it('blocks deleting lot with RESERVED bookings', async () => {
    const { owner, user, lot, vehicle } = await setup();
    await book(user.token, lot.id, vehicle.id).expect(201);

    const res = await request(app)
      .delete(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token));
    expect(res.status).toBe(409);
  });

  it('blocks deleting lot with ACTIVE bookings', async () => {
    const { owner, user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    const res = await request(app)
      .delete(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token));
    expect(res.status).toBe(409);
  });

  it('rejects setting availableSpaces above totalSpaces', async () => {
    const { owner, lot } = await setup();

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token))
      .send({ availableSpaces: 100, totalSpaces: 10 });
    expect(res.status).toBe(400);
  });

  it('rejects editing totalSpaces below occupied spaces', async () => {
    const { owner, user, lot, vehicle } = await setup({ totalSpaces: 10, availableSpaces: 5 });
    await book(user.token, lot.id, vehicle.id).expect(201);

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token))
      .send({ totalSpaces: 1 });
    expect(res.status).toBe(400);

    const unchanged = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(unchanged?.totalSpaces).toBe(10);
    expect(unchanged?.availableSpaces).toBe(4);
  });

it('allows reducing totalSpaces to exactly the occupied count', async () => {
    const { owner, user, lot, vehicle } = await setup({ totalSpaces: 10, availableSpaces: 5 });
    await book(user.token, lot.id, vehicle.id).expect(201);

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(owner.token))
      .send({ totalSpaces: 6 })
      .expect(200);

    expect(res.body.data.totalSpaces).toBe(6);
    expect(res.body.data.availableSpaces).toBe(0);
  });
});

describe('QA Audit — Heartbeat and session recovery', () => {
  beforeEach(resetDb);

  it('updates lastSeenAt on heartbeat for ACTIVE booking', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/heartbeat`)
      .set(auth(user.token))
      .send(atLot());
    expect(res.status).toBe(200);
    expect(res.body.data.lastSeenAt).toBeTruthy();
  });

  it('does not checkout via heartbeat', async () => {
    const { user, lot, vehicle } = await setup();
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    await request(app)
      .post(`/api/bookings/${booking.id}/heartbeat`)
      .set(auth(user.token))
      .send(farFromLot(500))
      .expect(200);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.status).toBe('ACTIVE');
  });

  it('auto-completes stale session and restores capacity once', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 2 });
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;
    await completeCheckIn(user.token, booking.id);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { lastSeenAt: new Date(Date.now() - 130_000) },
    });

    await request(app).get('/api/bookings').set(auth(user.token)).expect(200);

    const completed = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(completed?.status).toBe('COMPLETED');

    const lotAfter = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotAfter?.availableSpaces).toBe(2);

    await request(app).get('/api/bookings').set(auth(user.token)).expect(200);
    const lotAgain = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(lotAgain?.availableSpaces).toBe(2);
  });

  it('rejects heartbeat for another user booking', async () => {
    const { user, lot, vehicle } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/heartbeat`)
      .set(auth(other.token))
      .send(atLot());
    expect(res.status).toBe(404);
  });
});

describe('QA Audit — Authentication and authorization', () => {
  beforeEach(resetDb);

  it('BUG: wrong user check-in returns 409 instead of 404 when no location sent', async () => {
    const { user, lot, vehicle } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(other.token, booking.id);
    expect(res.status).toBe(409);
  });

  it('wrong user check-in with location returns 404', async () => {
    const { user, lot, vehicle } = await setup();
    const other = await createUser('other@example.com', 'USER');
    const booking = (await book(user.token, lot.id, vehicle.id).expect(201)).body.data;

    const res = await checkIn(other.token, booking.id, atLot());
    expect(res.status).toBe(404);
  });

  it('rejects owner editing another owner lot', async () => {
    const ownerA = await createUser('ownera@example.com', 'OWNER');
    const ownerB = await createUser('ownerb@example.com', 'OWNER');
    const lot = await createParkingLot(ownerA.token);

    const res = await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .set(auth(ownerB.token))
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('allows a normal user to list only their own lots on /mine', async () => {
    const user = await createUser('user@example.com', 'USER');

    const res = await request(app).get('/api/parking-lots/mine').set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('does not expose other users lots on /mine', async () => {
    const user = await createUser('user@example.com', 'USER');
    await createParkingLot(user.token);

    const other = await createUser('other@example.com', 'USER');
    const res = await request(app).get('/api/parking-lots/mine').set(auth(other.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects requests without token', async () => {
    await request(app).get('/api/bookings').expect(401);
    await request(app).post('/api/bookings').expect(401);
  });

  it('rejects malformed token', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set({ Authorization: 'Bearer not-a-valid-jwt' });
    expect(res.status).toBe(401);
  });

  it('rejects tampered JWT role claim', async () => {
    const user = await createUser('user@example.com', 'USER');
    const parts = user.token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.role = 'ADMIN';
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const res = await request(app)
      .get('/api/parking-lots/mine')
      .set({ Authorization: `Bearer ${tampered}` });
    expect(res.status).toBe(401);
  });
});

describe('QA Audit — Search and discovery', () => {
  beforeEach(resetDb);

  it('returns empty array for no matches', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token);

    const res = await request(app).get('/api/parking-lots').query({ q: 'nonexistent' }).expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes full lots when availableOnly=true', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token, { availableSpaces: 0 });

    const res = await request(app)
      .get('/api/parking-lots')
      .query({ availableOnly: 'true' })
      .expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('reflects reduced availability after booking', async () => {
    const { user, lot, vehicle } = await setup({ availableSpaces: 3 });
    await book(user.token, lot.id, vehicle.id).expect(201);

    const res = await request(app).get(`/api/parking-lots/${lot.id}`).expect(200);
    expect(res.body.data.availableSpaces).toBe(2);
  });
});
