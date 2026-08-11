import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  createUser,
  createParkingLot,
  createBooking,
  auth,
} from './helpers';

async function resetDb() {
  const { prisma } = await import('./helpers');
  await prisma.booking.deleteMany();
  await prisma.parkingLot.deleteMany();
  await prisma.user.deleteMany();
}

const VEHICLE = 'KA01AB1234';

async function setupOwnerWithLot(
  overrides: Record<string, unknown> = {},
  lots = 1,
) {
  const owner = await createUser('owner@example.com', 'OWNER');
  const lot = await createParkingLot(owner.token, overrides);

  const additionalLots: Awaited<ReturnType<typeof createParkingLot>>[] = [];
  for (let i = 1; i < lots; i += 1) {
    additionalLots.push(
      await createParkingLot(owner.token, { ...overrides, name: `Lot ${i}` }),
    );
  }

  return { owner, lot, additionalLots };
}

function ownerRequest(token: string, path: string) {
  return request(app).get(`/api/owner${path}`).set(auth(token));
}

describe('owner dashboard', () => {
  beforeEach(resetDb);

  it('requires authentication', async () => {
    await request(app).get('/api/owner/dashboard').expect(401);
  });

  it('rejects a regular USER', async () => {
    const user = await createUser('user@example.com', 'USER');
    await ownerRequest(user.token, '/dashboard').expect(403);
  });

  it('returns revenue from COMPLETED and ACTIVE bookings only', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, {
      pricePerHour: 40,
      totalSpaces: 10,
      availableSpaces: 10,
    });
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'COMPLETED',
      estimatedAmount: 80,
      finalAmount: 80,
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 180,
      status: 'ACTIVE',
      estimatedAmount: 120,
      checkInTime: new Date(Date.now() - 30 * 60_000),
      sessionEndsAt: new Date(Date.now() + 150 * 60_000),
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
      checkInDeadline: new Date(Date.now() + 10 * 60_000),
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'CANCELLED',
      estimatedAmount: 80,
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'EXPIRED',
      estimatedAmount: 80,
    });

    const res = await ownerRequest(owner.token, '/dashboard').expect(200);
    const data = res.body.data;

    expect(data.totalRevenue).toBe(200);
    expect(data.completedBookings).toBe(1);
    expect(data.activeBookings).toBe(1);
    expect(data.reservedBookings).toBe(1);
    expect(data.occupiedSlots).toBe(1);
    expect(data.availableSlots).toBe(8);
    expect(data.totalSlots).toBe(10);
    expect(data.occupancyPercentage).toBe(10);
    expect(data.todayRevenue).toBe(200);
    expect(data.monthlyRevenue).toBe(200);
  });

  it('only counts the owner\'s own parkings', async () => {
    const ownerA = await createUser('owner-a@example.com', 'OWNER');
    const ownerB = await createUser('owner-b@example.com', 'OWNER');
    const lotA = await createParkingLot(ownerA.token, { name: 'Lot A' });
    await createParkingLot(ownerB.token, { name: 'Lot B' });
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lotA.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'COMPLETED',
      estimatedAmount: 80,
      finalAmount: 80,
    });

    const res = await ownerRequest(ownerA.token, '/dashboard').expect(200);
    expect(res.body.data.totalRevenue).toBe(80);

    const resB = await ownerRequest(ownerB.token, '/dashboard').expect(200);
    expect(resB.body.data.totalRevenue).toBe(0);
  });
});

describe('owner parkings', () => {
  beforeEach(resetDb);

  it('marks a full lot and a closed lot correctly', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const full = await createParkingLot(owner.token, {
      name: 'Full Lot',
      pricePerHour: 50,
      totalSpaces: 2,
      availableSpaces: 2,
    });
    const closed = await createParkingLot(owner.token, {
      name: 'Closed Lot',
      status: 'INACTIVE',
    });
    const user = await createUser('user@example.com', 'USER');

    for (let i = 0; i < 2; i += 1) {
      await createBooking({
        userId: user.user.id,
        parkingLotId: full.id,
        vehicleNumber: `${VEHICLE.slice(0, 3)}${i}`,
        durationMinutes: 120,
        status: 'ACTIVE',
        estimatedAmount: 100,
        checkInTime: new Date(Date.now() - 10 * 60_000),
        sessionEndsAt: new Date(Date.now() + 110 * 60_000),
      });
    }

    const res = await ownerRequest(owner.token, '/parkings').expect(200);
    const parkings = res.body.data as Array<Record<string, unknown>>;

    const fullEntry = parkings.find((p) => p.id === full.id);
    const closedEntry = parkings.find((p) => p.id === closed.id);

    expect(fullEntry?.status).toBe('FULL');
    expect(fullEntry?.occupiedSlots).toBe(2);
    expect(fullEntry?.availableSlots).toBe(0);

    expect(closedEntry?.status).toBe('CLOSED');
  });

  it('returns revenue per parking', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, { pricePerHour: 30 });
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 240,
      status: 'COMPLETED',
      estimatedAmount: 120,
      finalAmount: 120,
    });

    const res = await ownerRequest(owner.token, '/parkings').expect(200);
    const parking = (res.body.data as Array<Record<string, unknown>>).find(
      (p) => p.id === lot.id,
    );

    expect(parking?.revenueGenerated).toBe(120);
  });
});

describe('owner parking status', () => {
  beforeEach(resetDb);

  it('returns a live slot grid with OCCUPIED / RESERVED / AVAILABLE', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, {
      pricePerHour: 40,
      totalSpaces: 4,
      availableSpaces: 4,
    });
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'ACTIVE',
      estimatedAmount: 80,
      checkInTime: new Date(Date.now() - 10 * 60_000),
      sessionEndsAt: new Date(Date.now() + 110 * 60_000),
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: 'KA02XY5678',
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
      checkInDeadline: new Date(Date.now() + 10 * 60_000),
    });

    const res = await ownerRequest(owner.token, `/parkings/${lot.id}/status`).expect(200);
    const data = res.body.data;

    expect(data.occupiedSlots).toBe(1);
    expect(data.reservedSlots).toBe(1);
    expect(data.availableSlots).toBe(2);
    expect(data.slots).toHaveLength(4);
    expect(data.slots[0]).toEqual({ slot: 'P1', status: 'OCCUPIED' });
    expect(data.slots[1]).toEqual({ slot: 'P2', status: 'RESERVED' });
    expect(data.slots[2]).toEqual({ slot: 'P3', status: 'AVAILABLE' });
    expect(data.slots[3]).toEqual({ slot: 'P4', status: 'AVAILABLE' });
  });

  it('returns 404 for a missing lot and 403 for another owner\'s lot', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const other = await createUser('other@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);

    await ownerRequest(owner.token, '/parkings/missing/status').expect(404);
    await ownerRequest(other.token, `/parkings/${lot.id}/status`).expect(403);
  });
});

describe('owner bookings', () => {
  beforeEach(resetDb);

  it('lists recent bookings with customer name and payment status', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'COMPLETED',
      estimatedAmount: 80,
      finalAmount: 80,
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: 'KA02XY5678',
      durationMinutes: 60,
      status: 'RESERVED',
      estimatedAmount: 40,
    });

    const res = await ownerRequest(owner.token, '/bookings?limit=10').expect(200);
    const bookings = res.body.data as Array<Record<string, unknown>>;

    expect(bookings).toHaveLength(2);

    const completed = bookings.find((b) => b.status === 'COMPLETED');
    const reserved = bookings.find((b) => b.status === 'RESERVED');

    expect(completed?.customerName).toBe('Test User');
    expect(completed?.vehicleNumber).toBe(VEHICLE);
    expect(completed?.paymentStatus).toBe('PAID');
    expect(completed?.amount).toBe(80);

    expect(reserved?.paymentStatus).toBe('PENDING');
    expect(reserved?.amount).toBe(40);
  });

  it('respects the limit query', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token);
    const user = await createUser('user@example.com', 'USER');

    for (let i = 0; i < 5; i += 1) {
      await createBooking({
        userId: user.user.id,
        parkingLotId: lot.id,
        vehicleNumber: VEHICLE,
        durationMinutes: 60,
        status: 'COMPLETED',
        estimatedAmount: 40,
        finalAmount: 40,
      });
    }

    const res = await ownerRequest(owner.token, '/bookings?limit=3').expect(200);
    expect((res.body.data as unknown[])).toHaveLength(3);
  });
});

describe('owner analytics', () => {
  beforeEach(resetDb);

  it('returns daily, monthly revenue and hourly occupancy trend', async () => {
    const owner = await createUser('owner@example.com', 'OWNER');
    const lot = await createParkingLot(owner.token, {
      pricePerHour: 40,
      totalSpaces: 5,
      availableSpaces: 5,
    });
    const user = await createUser('user@example.com', 'USER');

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: VEHICLE,
      durationMinutes: 120,
      status: 'COMPLETED',
      estimatedAmount: 80,
      finalAmount: 80,
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: 'KA02XY5678',
      durationMinutes: 120,
      status: 'ACTIVE',
      estimatedAmount: 80,
      checkInTime: new Date(Date.now() - 10 * 60_000),
      sessionEndsAt: new Date(Date.now() + 110 * 60_000),
    });

    const res = await ownerRequest(owner.token, '/analytics').expect(200);
    const data = res.body.data;

    expect(Array.isArray(data.dailyRevenue)).toBe(true);
    expect(data.dailyRevenue).toHaveLength(7);
    expect(Array.isArray(data.monthlyRevenue)).toBe(true);
    expect(data.monthlyRevenue).toHaveLength(12);
    expect(Array.isArray(data.occupancyTrend)).toBe(true);
    expect(data.occupancyTrend).toHaveLength(24);

    expect(data.dailyRevenue[6].value).toBe(160);
    expect(data.dailyRevenue[6].label).toBeTruthy();
    expect(data.monthlyRevenue[11].value).toBe(160);

    const currentHour = data.occupancyTrend[new Date().getUTCHours()];
    expect(currentHour.value).toBeGreaterThan(0);
  });
});
