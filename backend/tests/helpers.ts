import request from 'supertest';
import { prisma } from '../src/config/prisma';
import app from '../src/app';

export { app, prisma, request };

export const testPassword = 'Password123!';

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
      ...overrides,
    })
    .expect(201);

  return res.body.data;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
