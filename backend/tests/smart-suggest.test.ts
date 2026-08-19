import { describe, it, expect, beforeEach } from 'vitest';
import { request, app, prisma, resetDb, createUser, createParkingLot, createBooking, auth } from './helpers';

const VEHICLE = 'KA01AB1234';

const ORIGIN_LAT = 12.9756;
const ORIGIN_LNG = 77.6068;

describe('smart suggest backing data', () => {
  beforeEach(resetDb);

  async function seedAlternatives() {
    const owner = await createUser('owner@example.com', 'OWNER');
    const user = await createUser('user@example.com', 'USER');

    const original = await createParkingLot(owner.token, {
      name: 'Original Parking',
      latitude: ORIGIN_LAT,
      longitude: ORIGIN_LNG,
      availableSpaces: 5,
    });

    const nearA = await createParkingLot(owner.token, {
      name: 'Parking A',
      latitude: ORIGIN_LAT + 0.0003,
      longitude: ORIGIN_LNG + 0.0003,
      availableSpaces: 3,
    });

    const nearB = await createParkingLot(owner.token, {
      name: 'Parking B',
      latitude: ORIGIN_LAT + 0.0007,
      longitude: ORIGIN_LNG + 0.0007,
      availableSpaces: 2,
    });

    const nearC = await createParkingLot(owner.token, {
      name: 'Parking C',
      latitude: ORIGIN_LAT + 0.0012,
      longitude: ORIGIN_LNG + 0.0012,
      availableSpaces: 1,
    });

    const inactiveNear = await createParkingLot(owner.token, {
      name: 'Inactive Nearby',
      latitude: ORIGIN_LAT + 0.0014,
      longitude: ORIGIN_LNG + 0.0014,
      availableSpaces: 5,
      status: 'INACTIVE',
    });

    const fullNear = await createParkingLot(owner.token, {
      name: 'Full Nearby',
      latitude: ORIGIN_LAT + 0.0016,
      longitude: ORIGIN_LNG + 0.0016,
      availableSpaces: 0,
    });

    const booking = await createBooking({
      userId: user.user.id,
      parkingLotId: original.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'RESERVED',
      estimatedAmount: 80,
      checkInDeadline: new Date(Date.now() + 15 * 60_000),
    });

    return { owner, user, original, nearA, nearB, nearC, inactiveNear, fullNear, booking };
  }

  it('returns PARKING_DEACTIVATED and the original lot coordinates after deactivation', async () => {
    const { owner, user, original, booking } = await seedAlternatives();

    await request(app)
      .patch(`/api/parking-lots/${original.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    const res = await request(app).get('/api/bookings').set(auth(user.token)).expect(200);
    const row = res.body.data.find((b: { id: string }) => b.id === booking.id);

    expect(row.status).toBe('CANCELLED');
    expect(row.cancellationReason).toBe('PARKING_DEACTIVATED');
    expect(row.cancelledAt).toBeTruthy();
    expect(row.parkingLot.latitude).toBeCloseTo(ORIGIN_LAT, 4);
    expect(row.parkingLot.longitude).toBeCloseTo(ORIGIN_LNG, 4);
  });

  it('distinguishes a user-cancelled booking from a deactivation cancellation', async () => {
    const { owner, user, original, booking } = await seedAlternatives();

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set(auth(user.token))
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.cancellationReason).toBe('USER_CANCELLED');
  });

  it('suggests the 3 nearest ACTIVE lots and excludes the original, inactive, and full lots', async () => {
    const { owner, original, nearA, nearB, nearC, inactiveNear, fullNear } = await seedAlternatives();

    await request(app)
      .patch(`/api/parking-lots/${original.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    const res = await request(app)
      .get('/api/parking-lots')
      .query({
        sort: 'nearest',
        lat: ORIGIN_LAT,
        lng: ORIGIN_LNG,
        availableOnly: 'true',
      })
      .expect(200);

    const ids = res.body.data.map((lot: { id: string }) => lot.id);
    const names = res.body.data.map((lot: { name: string }) => lot.name);

    expect(ids).toEqual([nearA.id, nearB.id, nearC.id]);
    expect(names).toEqual(['Parking A', 'Parking B', 'Parking C']);

    const excluded = [original.id, inactiveNear.id, fullNear.id];
    for (const id of excluded) {
      expect(ids).not.toContain(id);
    }

    const distances = res.body.data.map((lot: { distanceKm: number }) => lot.distanceKm);
    expect(distances).toHaveLength(3);
    for (const distance of distances) {
      expect(distance).toBeTypeOf('number');
    }
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('keeps parking search strict: only ACTIVE with availableSpaces > 0', async () => {
    const { owner, original, nearA, inactiveNear, fullNear } = await seedAlternatives();

    await request(app)
      .patch(`/api/parking-lots/${original.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    const res = await request(app)
      .get('/api/parking-lots')
      .query({
        sort: 'nearest',
        lat: ORIGIN_LAT,
        lng: ORIGIN_LNG,
        availableOnly: 'true',
      })
      .expect(200);

    for (const lot of res.body.data) {
      expect(lot.status).toBe('ACTIVE');
      expect(lot.availableSpaces).toBeGreaterThan(0);
    }

    const ids = res.body.data.map((lot: { id: string }) => lot.id);
    expect(ids).toContain(nearA.id);
    expect(ids).not.toContain(inactiveNear.id);
    expect(ids).not.toContain(fullNear.id);
  });

  it('allows a fresh booking at a suggested lot after deactivation (validation still authoritative)', async () => {
    const { owner, user, original, nearA } = await seedAlternatives();
    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.user.id,
        registration: 'KA01AB9999',
        type: 'FOUR_WHEELER',
        imageUrl: 'https://res.cloudinary.com/parkmitra/image/upload/v1/test/vehicle.jpg',
        imagePublicId: 'parkmitra/vehicles/test/vehicle',
        // createBooking only accepts a verified vehicle; this test is about
        // lot suggestion, not the verification gate.
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    await request(app)
      .patch(`/api/parking-lots/${original.id}`)
      .set(auth(owner.token))
      .send({ status: 'INACTIVE' })
      .expect(200);

    const res = await request(app)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({
        parkingLotId: nearA.id,
        vehicleId: vehicle.id,
        durationMinutes: 120,
      })
      .expect(201);

    expect(res.body.data.parkingLotId).toBe(nearA.id);
    expect(res.body.data.status).toBe('RESERVED');
  });
});