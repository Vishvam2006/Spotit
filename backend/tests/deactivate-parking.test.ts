import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  prisma,
  resetDb,
  createUser,
  createParkingLot,
  createBooking,
  createVehicleRecord,
  auth,
} from './helpers';

const VEHICLE = 'KA01AB1234';

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

function deactivate(token: string, id: string) {
  return request(app)
    .patch(`/api/parking-lots/${id}`)
    .set(auth(token))
    .send({ status: 'INACTIVE' });
}

function activate(token: string, id: string) {
  return request(app)
    .patch(`/api/parking-lots/${id}`)
    .set(auth(token))
    .send({ status: 'ACTIVE' });
}

async function setupUpcomingBooking(): Promise<{
  owner: { token: string; user: { id: string } };
  user: { token: string; user: { id: string } };
  lot: { id: string; status: string; availableSpaces: number };
  booking: { id: string; status: string };
}> {
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
  return { owner, user, lot, booking };
}

async function getBooking(id: string) {
  const row = await prisma.booking.findUnique({ where: { id } });
  if (!row) throw new Error(`booking ${id} not found`);
  return row;
}

describe('parking deactivation', () => {
  beforeEach(resetDb);

  it('deactivates a lot with no bookings and reports no cancellations', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.data.status).toBe('INACTIVE');
    expect(res.body.cancelledBookings).toBeUndefined();
  });

  it('cancels a single upcoming RESERVED booking with PARKING_DEACTIVATED', async () => {
    const { owner, lot, booking } = await setupUpcomingBooking();

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBe(1);
    expect(res.body.data.status).toBe('INACTIVE');

    const updated = await getBooking(booking.id);
    expect(updated.status).toBe('CANCELLED');
    expect(updated.cancellationReason).toBe('PARKING_DEACTIVATED');
    expect(updated.cancelledAt).not.toBeNull();

    const parking = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(parking?.availableSpaces).toBe(6);
  });

  it('cancels all upcoming RESERVED bookings', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 8 });

    const bookings = [];
    for (let i = 0; i < 3; i += 1) {
      bookings.push(
        await createBooking({
          userId: user.user.id,
          parkingLotId: lot.id,
          vehicleNumber: `${VEHICLE}_${i}`,
          durationMinutes: 60,
          status: 'RESERVED',
          estimatedAmount: 40,
          checkInDeadline: minutesFromNow(15),
        }),
      );
    }

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBe(3);

    for (const booking of bookings) {
      const updated = await getBooking(booking.id);
      expect(updated.status).toBe('CANCELLED');
      expect(updated.cancellationReason).toBe('PARKING_DEACTIVATED');
    }

    const parking = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(parking?.availableSpaces).toBe(11);
  });

  it('leaves COMPLETED bookings untouched', async () => {
    const { owner, lot, booking } = await setupUpcomingBooking();
    const completed = await createBooking({
      userId: (await getBooking(booking.id)).userId,
      parkingLotId: lot.id,
      vehicleNumber: 'KA99ZZ0000',
      durationMinutes: 60,
      status: 'COMPLETED',
      estimatedAmount: 40,
      finalAmount: 40,
      checkInTime: new Date(Date.now() - 120 * 60_000),
      checkOutTime: new Date(Date.now() - 60 * 60_000),
    });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBe(1);

    const kept = await getBooking(completed.id);
    expect(kept.status).toBe('COMPLETED');
    expect(kept.cancellationReason).toBeNull();
    expect(kept.cancelledAt).toBeNull();
  });

  it('leaves already-CANCELLED bookings untouched and keeps their reason', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });

    const alreadyCancelled = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'CANCELLED',
      estimatedAmount: 40,
      cancellationReason: 'USER_CANCELLED',
      cancelledAt: minutesFromNow(-30),
    });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBeUndefined();

    const kept = await getBooking(alreadyCancelled.id);
    expect(kept.status).toBe('CANCELLED');
    expect(kept.cancellationReason).toBe('USER_CANCELLED');
  });

  it('leaves EXPIRED bookings untouched', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });

    const expired = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'EXPIRED',
      estimatedAmount: 40,
    });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBeUndefined();

    const kept = await getBooking(expired.id);
    expect(kept.status).toBe('EXPIRED');
  });

  it('leaves past (deadline-passed) RESERVED bookings untouched', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, { availableSpaces: 5 });

    const past = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
      checkInDeadline: minutesFromNow(-5),
    });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.cancelledBookings).toBeUndefined();

    const kept = await getBooking(past.id);
    expect(kept.status).toBe('RESERVED');

    const parking = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(parking?.availableSpaces).toBe(5);
  });

  it('is idempotent and never double-increments availableSpaces', async () => {
    const { owner, lot, booking } = await setupUpcomingBooking();

    await deactivate(owner.token, lot.id).expect(200);

    const afterFirst = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(afterFirst?.availableSpaces).toBe(6);

    const res = await deactivate(owner.token, lot.id).expect(200);
    expect(res.body.data.status).toBe('INACTIVE');
    expect(res.body.cancelledBookings).toBeUndefined();

    const updated = await getBooking(booking.id);
    expect(updated.status).toBe('CANCELLED');
    expect(updated.cancellationReason).toBe('PARKING_DEACTIVATED');

    const afterSecond = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(afterSecond?.availableSpaces).toBe(6);
  });

  it('does not cancel bookings when deactivating an already-INACTIVE lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');
    const lot = await createParkingLot(owner.token, {
      status: 'INACTIVE',
      availableSpaces: 5,
    });

    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
      checkInDeadline: minutesFromNow(15),
    });

    const res = await deactivate(owner.token, lot.id).expect(200);

    expect(res.body.data.status).toBe('INACTIVE');
    expect(res.body.cancelledBookings).toBeUndefined();

    const kept = await getBooking(booking.id);
    expect(kept.status).toBe('RESERVED');
    expect(kept.cancellationReason).toBeNull();

    const parking = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(parking?.availableSpaces).toBe(5);
  });

  it('requires authentication', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    await request(app)
      .patch(`/api/parking-lots/${lot.id}`)
      .send({ status: 'INACTIVE' })
      .expect(401);
  });

  it('rejects a non-owner from deactivating', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const other = await createUser('other@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    const res = await deactivate(other.token, lot.id).expect(403);
    expect(res.body.message).toBe('Unauthorized');

    const parking = await prisma.parkingLot.findUnique({ where: { id: lot.id } });
    expect(parking?.status).toBe('ACTIVE');
  });

  it('returns 404 for a missing parking lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');

    const res = await deactivate(owner.token, 'missing-lot-id').expect(404);
    expect(res.body.message).toBe('Parking lot not found');
  });

  it('does not restore cancelled bookings on reactivation', async () => {
    const { owner, lot, booking } = await setupUpcomingBooking();

    await deactivate(owner.token, lot.id).expect(200);

    const res = await activate(owner.token, lot.id).expect(200);
    expect(res.body.data.status).toBe('ACTIVE');

    const kept = await getBooking(booking.id);
    expect(kept.status).toBe('CANCELLED');
    expect(kept.cancellationReason).toBe('PARKING_DEACTIVATED');
  });

  it('rejects new bookings after deactivation (backend enforcement)', async () => {
    const { owner, user, lot } = await setupUpcomingBooking();
    const vehicle = await createVehicleRecord(user.user.id, {
      registration: 'KA01AB9999',
    });

    await deactivate(owner.token, lot.id).expect(200);

    const res = await request(app)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({
        parkingLotId: lot.id,
        vehicleId: vehicle.id,
        durationMinutes: 120,
      })
      .expect(409);

    expect(res.body.message).toBe('Parking lot is not active');
  });

  it('returns cancellationReason to the affected user via the bookings API', async () => {
    const { owner, user, lot, booking } = await setupUpcomingBooking();

    await deactivate(owner.token, lot.id).expect(200);

    const res = await request(app).get('/api/bookings').set(auth(user.token)).expect(200);
    const row = res.body.data.find((b: { id: string }) => b.id === booking.id);

    expect(row.status).toBe('CANCELLED');
    expect(row.cancellationReason).toBe('PARKING_DEACTIVATED');
    expect(row.cancelledAt).toBeTruthy();
  });

  it('excludes the deactivated lot from public search and keeps active alternatives', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    await createParkingLot(owner.token, {
      name: 'Lot A',
      availableSpaces: 2,
      latitude: 12.9756,
      longitude: 77.6068,
    });
    await createParkingLot(owner.token, {
      name: 'Lot B',
      availableSpaces: 3,
      latitude: 12.9757,
      longitude: 77.6069,
    });

    const res = await request(app)
      .get('/api/parking-lots')
      .query({ sort: 'nearest', lat: 12.9756, lng: 77.6068, availableOnly: 'true' })
      .expect(200);

    expect(res.body.data).toHaveLength(2);

    const lotA = res.body.data.find((lot: { name: string }) => lot.name === 'Lot A');
    expect(lotA.status).toBe('ACTIVE');
    expect(lotA.availableSpaces).toBeGreaterThan(0);

    await request(app)
      .patch(`/api/parking-lots/${lotA.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    const after = await request(app)
      .get('/api/parking-lots')
      .query({ sort: 'nearest', lat: 12.9756, lng: 77.6068, availableOnly: 'true' })
      .expect(200);

    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].name).toBe('Lot B');
  });
});