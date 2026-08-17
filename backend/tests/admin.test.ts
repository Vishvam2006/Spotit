import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  prisma,
  resetDb,
  testPassword,
  createUser,
  createParkingLot,
  createVehicleRecord,
  createBooking,
  auth,
} from './helpers';

async function createAdmin() {
  return createUser('admin@example.com', 'ADMIN');
}

async function createOwner() {
  return createUser('owner@example.com', 'OWNER');
}

async function createUserAccount() {
  return createUser('user@example.com', 'USER');
}

describe('admin authentication', () => {
  beforeEach(resetDb);

  it('allows an admin account to log in', async () => {
    const admin = await createAdmin();
    expect(admin.token).toBeTruthy();
    expect(admin.user.role).toBe('ADMIN');
  });

  it('rejects admin APIs without authentication (401)', async () => {
    const res = await request(app).get('/api/admin/dashboard').expect(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('rejects admin APIs for a USER (403)', async () => {
    const user = await createUserAccount();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(auth(user.token))
      .expect(403);
    expect(res.body.message).toContain('Admin access required');
  });

  it('rejects admin APIs for an OWNER (403)', async () => {
    const owner = await createOwner();
    const res = await request(app)
      .get('/api/admin/bookings')
      .set(auth(owner.token))
      .expect(403);
    expect(res.body.message).toContain('Admin access required');
  });

  it('allows an ADMIN to access admin APIs (200)', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(auth(admin.token))
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

describe('admin dashboard', () => {
  beforeEach(resetDb);

  it('returns zeroed statistics for an empty dataset', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data).toMatchObject({
      totalUsers: 0,
      totalOwners: 0,
      totalParkings: 0,
      totalBookings: 0,
      activeReservations: 0,
      currentlyCheckedIn: 0,
      currentlyCheckedOut: 0,
      pendingComplaints: 0,
    });
  });

  it('returns real aggregated statistics', async () => {
    const owner = await createOwner();
    const user = await createUserAccount();
    const admin = await createAdmin();

    const lot = await createParkingLot(owner.token);
    const vehicle = await createVehicleRecord(user.user.id);

    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: vehicle.registration,
      durationMinutes: 120,
      status: 'RESERVED',
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: vehicle.registration,
      durationMinutes: 120,
      status: 'ACTIVE',
      checkInTime: new Date(),
      sessionEndsAt: new Date(Date.now() + 120 * 60_000),
    });
    await createBooking({
      userId: user.user.id,
      parkingLotId: lot.id,
      vehicleNumber: vehicle.registration,
      durationMinutes: 120,
      status: 'COMPLETED',
      checkInTime: new Date(Date.now() - 60 * 60_000),
      checkOutTime: new Date(),
    });

    await prisma.complaint.create({
      data: {
        userId: user.user.id,
        category: 'Payment',
        subject: 'Overcharged',
        description: 'I was charged more than the quoted price.',
      },
    });

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data).toMatchObject({
      totalUsers: 1,
      totalOwners: 1,
      totalParkings: 1,
      totalBookings: 3,
      activeReservations: 1,
      currentlyCheckedIn: 1,
      currentlyCheckedOut: 1,
      pendingComplaints: 1,
    });
  });
});

describe('admin complaints', () => {
  beforeEach(resetDb);

  async function createComplaintViaApi(token: string) {
    return request(app)
      .post('/api/complaints')
      .set(auth(token))
      .send({
        category: 'Cleanliness',
        subject: 'Dirty parking spot',
        description: 'The assigned spot was not cleaned at all.',
      })
      .expect(201);
  }

  it('lets a user submit a complaint', async () => {
    const user = await createUserAccount();
    const res = await createComplaintViaApi(user.token);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.user.fullName).toBeTruthy();
  });

  it('lets the admin retrieve complaints', async () => {
    const user = await createUserAccount();
    const admin = await createAdmin();
    await createComplaintViaApi(user.token);

    const res = await request(app)
      .get('/api/admin/complaints')
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0]).toMatchObject({
      category: 'Cleanliness',
      subject: 'Dirty parking spot',
    });
    expect(res.body.data.items[0].user.email).toBe('user@example.com');
  });

  it('lets the admin retrieve a single complaint', async () => {
    const user = await createUserAccount();
    const admin = await createAdmin();
    const created = await createComplaintViaApi(user.token);

    const res = await request(app)
      .get(`/api/admin/complaints/${created.body.data.id}`)
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.id).toBe(created.body.data.id);
    expect(res.body.data.description).toContain('cleaned');
  });

  it('returns 404 for an invalid complaint id', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get('/api/admin/complaints/does-not-exist')
      .set(auth(admin.token))
      .expect(404);
    expect(res.body.message).toBe('Complaint not found');
  });

  it('lets the admin update a complaint status', async () => {
    const user = await createUserAccount();
    const admin = await createAdmin();
    const created = await createComplaintViaApi(user.token);

    const res = await request(app)
      .patch(`/api/admin/complaints/${created.body.data.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'RESOLVED' })
      .expect(200);

    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedAt).toBeTruthy();
  });

  it('rejects an invalid complaint status', async () => {
    const user = await createUserAccount();
    const admin = await createAdmin();
    const created = await createComplaintViaApi(user.token);

    const res = await request(app)
      .patch(`/api/admin/complaints/${created.body.data.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'NOT_A_STATUS' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('prevents a non-admin from updating a complaint status (403)', async () => {
    const user = await createUserAccount();
    const created = await createComplaintViaApi(user.token);

    const res = await request(app)
      .patch(`/api/admin/complaints/${created.body.data.id}/status`)
      .set(auth(user.token))
      .send({ status: 'RESOLVED' })
      .expect(403);
    expect(res.body.message).toContain('Admin access required');
  });
});

describe('admin bookings', () => {
  beforeEach(resetDb);

  async function setupBookings(statuses: string[]) {
    const owner = await createOwner();
    const user = await createUserAccount();
    const admin = await createAdmin();
    const lot = await createParkingLot(owner.token);
    const vehicle = await createVehicleRecord(user.user.id);

    const ids: string[] = [];
    for (const status of statuses) {
      const booking = await createBooking({
        userId: user.user.id,
        parkingLotId: lot.id,
        vehicleNumber: vehicle.registration,
        durationMinutes: 120,
        status: status as 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED',
        checkInTime: status === 'ACTIVE' || status === 'COMPLETED' ? new Date() : null,
        sessionEndsAt:
          status === 'ACTIVE' || status === 'COMPLETED'
            ? new Date(Date.now() + 120 * 60_000)
            : null,
        checkOutTime: status === 'COMPLETED' ? new Date() : null,
      });
      ids.push(booking.id);
    }

    return { admin, user, owner, lot, vehicle, ids };
  }

  it('lets the admin retrieve bookings with correct statuses', async () => {
    const { admin } = await setupBookings(['RESERVED', 'ACTIVE', 'COMPLETED']);

    const res = await request(app)
      .get('/api/admin/bookings')
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.total).toBe(3);

    const statuses = res.body.data.items.map(
      (item: { status: string }) => item.status,
    );
    expect(statuses).toContain('RESERVED');
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('COMPLETED');
  });

  it('includes user and parking owner details', async () => {
    const { admin, user, lot } = await setupBookings(['RESERVED']);

    const res = await request(app)
      .get('/api/admin/bookings')
      .set(auth(admin.token))
      .expect(200);

    const item = res.body.data.items[0];
    expect(item.user).toMatchObject({
      id: user.user.id,
      fullName: 'Test User',
      email: 'user@example.com',
    });
    expect(item.parkingLot).toMatchObject({
      id: lot.id,
      name: 'Test Parking',
    });
    expect(item.parkingLot.owner.fullName).toBe('Test User');
  });

  it('filters bookings by status', async () => {
    const { admin } = await setupBookings(['RESERVED', 'ACTIVE', 'COMPLETED']);

    const res = await request(app)
      .get('/api/admin/bookings')
      .query({ status: 'ACTIVE' })
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].status).toBe('ACTIVE');
  });

  it('searches bookings by vehicle number', async () => {
    const { admin, vehicle } = await setupBookings(['RESERVED', 'ACTIVE']);

    const res = await request(app)
      .get('/api/admin/bookings')
      .query({ search: vehicle.registration.slice(0, 4) })
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.total).toBe(2);
  });

  it('searches bookings by parking name', async () => {
    const { admin } = await setupBookings(['RESERVED']);

    const res = await request(app)
      .get('/api/admin/bookings')
      .query({ search: 'Test Parking' })
      .set(auth(admin.token))
      .expect(200);

    expect(res.body.data.total).toBe(1);
  });

  it('paginates bookings server-side', async () => {
    const { admin } = await setupBookings([
      'RESERVED',
      'RESERVED',
      'RESERVED',
    ]);

    const page1 = await request(app)
      .get('/api/admin/bookings')
      .query({ page: 1, limit: 2 })
      .set(auth(admin.token))
      .expect(200);

    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.total).toBe(3);
    expect(page1.body.data.totalPages).toBe(2);

    const page2 = await request(app)
      .get('/api/admin/bookings')
      .query({ page: 2, limit: 2 })
      .set(auth(admin.token))
      .expect(200);

    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.page).toBe(2);
  });

  it('returns 404 for an invalid booking id', async () => {
    const { admin } = await setupBookings(['RESERVED']);

    const res = await request(app)
      .get('/api/admin/bookings/does-not-exist')
      .set(auth(admin.token))
      .expect(404);
    expect(res.body.message).toBe('Booking not found');
  });

  it('prevents a non-admin from accessing booking details (403)', async () => {
    const { user } = await setupBookings(['RESERVED']);

    const res = await request(app)
      .get('/api/admin/bookings/whatever')
      .set(auth(user.token))
      .expect(403);
    expect(res.body.message).toContain('Admin access required');
  });
});