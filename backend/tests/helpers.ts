import { expect } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/config/prisma';
import app from '../src/app';

export { app, prisma, request };

export const testPassword = 'Password123!';

export const testPhoto = 'data:image/png;base64,iVBORw0KGgo=';

export const testPhotos = [testPhoto, testPhoto];

export interface ParkingLotOverrides {
  name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  pricePerHour?: number;
  totalSpaces?: number;
  availableSpaces?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  photos?: string[];
}

export async function resetDb() {
  // Delete all records in the correct order to respect foreign key constraints
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.parkingLot.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(
  email: string,
  role: 'USER' | 'OWNER' = 'USER',
): Promise<{ token: string; user: { id: string; role: string } }> {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Test User',
      email,
      password: testPassword,
    })
    .expect(201);

  if (role !== 'USER') {
    await prisma.user.update({
      where: { email },
      data: { role },
    });
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: testPassword })
    .expect(200);

  return {
    token: loginRes.body.token as string,
    user: {
      id: registerRes.body.user.id as string,
      role: loginRes.body.user.role as string,
    },
  };
}

export interface ParkingLotOverrides {
  name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  pricePerHour?: number;
  totalSpaces?: number;
  availableSpaces?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
}

export async function createParkingLot(
  token: string,
  overrides: ParkingLotOverrides = {},
): Promise<{
  id: string;
  status: string;
  pricePerHour: number;
  availableSpaces: number;
  totalSpaces: number;
}> {
  const res = await request(app)
    .post('/api/parking-lots')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Parking',
      address: 'MG Road',
      city: 'Bengaluru',
      latitude: 12.9756,
      longitude: 77.6068,
      pricePerHour: 40,
      totalSpaces: 10,
      availableSpaces: 5,
      status: 'ACTIVE',
      photos: testPhotos,
      ...overrides,
    })
    .expect(201);

  return res.body.data;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface VehicleOverrides {
  registration?: string;
  type?: 'TWO_WHEELER' | 'FOUR_WHEELER';
  imageUrl?: string;
  imagePublicId?: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  isDefault?: boolean;
}

export const testVehicleImageUrl = 'https://res.cloudinary.com/parkmitra/image/upload/v1/test/vehicle.jpg';

/**
 * Creates a Vehicle row directly in the database. Used by booking/owner
 * tests that only need a real vehicle record to exist; Cloudinary
 * endpoints are exercised separately in vehicles.test.ts.
 */
export async function createVehicleRecord(
  userId: string,
  overrides: VehicleOverrides = {},
): Promise<{ id: string; registration: string; type: string }> {
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      registration: overrides.registration ?? 'KA01AB1234',
      type: overrides.type ?? 'FOUR_WHEELER',
      imageUrl: overrides.imageUrl ?? testVehicleImageUrl,
      imagePublicId: overrides.imagePublicId ?? `parkmitra/vehicles/${userId}/vehicle-1`,
      make: overrides.make ?? 'Hyundai',
      model: overrides.model ?? 'i20',
      color: overrides.color ?? 'White',
      isDefault: overrides.isDefault ?? false,
    },
    select: { id: true, registration: true, type: true },
  });

  return vehicle;
}

/** Coordinates used by createParkingLot; location samples must match them. */
export const LOT_LAT = 12.9756;
export const LOT_LNG = 77.6068;

export function locationSample(
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

export function atLot(overrides: Record<string, unknown> = {}) {
  return locationSample(LOT_LAT, LOT_LNG, overrides);
}

export function farFromLot(metersAway = 500) {
  const offset = metersAway / 111_000;
  return locationSample(LOT_LAT + offset, LOT_LNG + offset);
}

/**
 * Drives a check-in through the geofence verification (two accepted
 * readings, 30s dwell) and resolves once the booking is ACTIVE.
 */
export async function completeCheckIn(token: string, bookingId: string) {
  const first = await request(app)
    .post(`/api/bookings/${bookingId}/check-in`)
    .set(auth(token))
    .send(atLot());
  expect(first.status).toBe(202);

  const second = await request(app)
    .post(`/api/bookings/${bookingId}/check-in`)
    .set(auth(token))
    .send(atLot({ capturedAt: new Date(Date.now() + 31_000).toISOString() }));
  expect(second.status).toBe(200);
  expect(second.body.data.status).toBe('ACTIVE');
  return second.body.data;
}

/**
 * Drives a check-out through geofence verification (three outside
 * readings, 180s grace) and resolves once the booking is COMPLETED.
 */
export async function completeCheckOut(token: string, bookingId: string) {
  const outside = farFromLot(500);
  for (let i = 0; i < 3; i++) {
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/check-out`)
      .set(auth(token))
      .send({
        ...outside,
        capturedAt: new Date(Date.now() + i * 1000).toISOString(),
      });
    if (i < 2) {
      expect(res.status).toBe(202);
    }
  }
  const final = await request(app)
    .post(`/api/bookings/${bookingId}/check-out`)
    .set(auth(token))
    .send({
      ...outside,
      capturedAt: new Date(Date.now() + 181_000).toISOString(),
    });
  expect(final.status).toBe(200);
  expect(final.body.data.status).toBe('COMPLETED');
  return final.body.data;
}

export interface DirectBookingInput {
  userId: string;
  parkingLotId: string;
  vehicleNumber: string;
  durationMinutes: number;
  status?: 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  reservedAt?: Date;
  checkInDeadline?: Date;
  checkInTime?: Date | null;
  sessionEndsAt?: Date | null;
  checkOutTime?: Date | null;
  estimatedAmount?: number;
  finalAmount?: number | null;
  vehicleId?: string | null;
  vehicleRegistration?: string;
  vehicleType?: 'TWO_WHEELER' | 'FOUR_WHEELER';
  vehicleImageUrl?: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
}

export async function createBooking(
  data: DirectBookingInput,
): Promise<{ id: string; status: string }> {
  const now = new Date();
  const reservedAt = data.reservedAt ?? now;
  const checkInDeadline = data.checkInDeadline ?? new Date(now.getTime() + 15 * 60_000);
  const durationMinutes = data.durationMinutes;
  const estimatedAmount =
    data.estimatedAmount ?? Math.round((durationMinutes / 60) * 40);

  const booking = await prisma.booking.create({
    data: {
      userId: data.userId,
      parkingLotId: data.parkingLotId,
      vehicleNumber: data.vehicleNumber,
      vehicleId: data.vehicleId ?? null,
      vehicleRegistration: data.vehicleRegistration ?? data.vehicleNumber,
      vehicleType: data.vehicleType ?? 'FOUR_WHEELER',
      vehicleImageUrl: data.vehicleImageUrl ?? '',
      vehicleMake: data.vehicleMake ?? null,
      vehicleModel: data.vehicleModel ?? null,
      vehicleColor: data.vehicleColor ?? null,
      durationMinutes,
      reservedAt,
      checkInDeadline,
      status: data.status ?? 'RESERVED',
      checkInTime: data.checkInTime ?? null,
      sessionEndsAt: data.sessionEndsAt ?? null,
      checkOutTime: data.checkOutTime ?? null,
      estimatedAmount,
      finalAmount: data.finalAmount ?? null,
    },
    select: { id: true, status: true },
  });

  return booking;
}
