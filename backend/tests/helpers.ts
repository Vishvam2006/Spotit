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
