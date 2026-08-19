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

const EVIDENCE = 'https://res.cloudinary.com/parkmitra/image/upload/v1/evidence/full-lot.jpg';

describe('continuity engine', () => {
  beforeEach(resetDb);

  async function setup(lotOverrides: Record<string, unknown> = {}) {
    const owner = await createUser('owner@example.com', 'OWNER');
    const admin = await createUser('admin@example.com', 'USER');
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'ADMIN' },
    });
    // Re-login so the JWT carries the ADMIN role.
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' })
      .expect(200);

    const lot = await createParkingLot(owner.token, lotOverrides);
    return { owner, admin: { ...admin, token: adminLogin.body.token as string }, lot };
  }

  async function bookAs(email: string, lotId: string, registration: string) {
    const user = await createUser(email, 'USER');
    const vehicle = await createVehicleRecord(user.user.id, { registration });
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({ parkingLotId: lotId, vehicleId: vehicle.id, durationMinutes: 120 })
      .expect(201);
    return { user, booking: res.body.data as { id: string; status: string } };
  }

  function report(token: string, bookingId: string, body: Record<string, unknown> = {}) {
    return request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set(auth(token))
      .send({
        issueType: 'SPACE_UNAVAILABLE',
        description: 'The bay I reserved was taken by another car.',
        photos: [EVIDENCE],
        ...body,
      });
  }

  describe('protecting the booking', () => {
    it('freezes the booking as DISPUTED instead of cancelling it', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      const res = await report(user.token, booking.id).expect(201);

      expect(res.body.data.bookingStatus).toBe('DISPUTED');
      expect(res.body.data.bookingProtected).toBe(true);

      // The booking row still exists, with its history intact.
      const stored = await prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
      });
      expect(stored.status).toBe('DISPUTED');
      expect(stored.disputedAt).not.toBeNull();
      expect(stored.cancelledAt).toBeNull();
      expect(stored.cancellationReason).toBeNull();
    });

    it('ties the report to user, booking, lot, time and photo evidence', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      const res = await report(user.token, booking.id).expect(201);
      const stored = await prisma.complaint.findUniqueOrThrow({
        where: { id: res.body.data.report.id },
      });

      expect(stored.userId).toBe(user.user.id);
      expect(stored.bookingId).toBe(booking.id);
      expect(stored.parkingLotId).toBe(lot.id);
      expect(stored.issueType).toBe('SPACE_UNAVAILABLE');
      expect(stored.severity).toBe('SERIOUS');
      expect(stored.photos).toEqual([EVIDENCE]);
      expect(stored.status).toBe('PENDING');
      expect(stored.createdAt).toBeInstanceOf(Date);
    });

    it('returns the held space to the lot, since the user never parked', async () => {
      const { lot } = await setup({ totalSpaces: 10, availableSpaces: 5 });
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      const afterBooking = await prisma.parkingLot.findUniqueOrThrow({
        where: { id: lot.id },
      });
      expect(afterBooking.availableSpaces).toBe(4);

      await report(user.token, booking.id).expect(201);

      const afterReport = await prisma.parkingLot.findUniqueOrThrow({
        where: { id: lot.id },
      });
      expect(afterReport.availableSpaces).toBe(5);
    });

    it('never lets a release push availableSpaces past totalSpaces', async () => {
      const { lot } = await setup({ totalSpaces: 10, availableSpaces: 5 });
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      // Simulate a lost release: the counter is already back at full while the
      // booking still believes it holds a space.
      await prisma.parkingLot.update({
        where: { id: lot.id },
        data: { availableSpaces: 10 },
      });

      await report(user.token, booking.id).expect(201);

      const after = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(after.availableSpaces).toBe(10);
    });

    it('rejects a second open report for the same booking', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await report(user.token, booking.id).expect(201);
      const second = await report(user.token, booking.id).expect(409);
      expect(second.body.message).toMatch(/already have an open report/i);
    });

    it('leaves the booking alone for a MINOR report', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      const res = await report(user.token, booking.id, {
        issueType: 'OTHER',
        description: 'The signage on the way in was hard to read.',
        photos: [],
      }).expect(201);

      expect(res.body.data.bookingStatus).toBe('RESERVED');
      expect(res.body.data.bookingProtected).toBe(false);

      const lotAfter = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(lotAfter.status).toBe('ACTIVE');
      expect(lotAfter.availabilityConfidence).toBe('HIGH');
    });
  });

  describe('booking state machine', () => {
    it('refuses to report a cancelled booking', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await request(app)
        .post(`/api/bookings/${booking.id}/cancel`)
        .set(auth(user.token))
        .expect(200);

      const res = await report(user.token, booking.id).expect(409);
      expect(res.body.message).toMatch(/cannot be reported/i);
    });

    it('refuses to check in a disputed booking', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await report(user.token, booking.id).expect(201);

      const res = await request(app)
        .post(`/api/bookings/${booking.id}/check-in`)
        .set(auth(user.token))
        .send({
          lat: 12.9756,
          lng: 77.6068,
          accuracy: 10,
          capturedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(409);
    });

    it('does not expire a disputed booking when its deadline passes', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await report(user.token, booking.id).expect(201);

      await prisma.booking.update({
        where: { id: booking.id },
        data: { checkInDeadline: new Date(Date.now() - 60_000) },
      });

      // Any read runs the expiry sweep.
      await request(app).get('/api/bookings').set(auth(user.token)).expect(200);

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(stored.status).toBe('DISPUTED');
    });
  });

  describe('reporting after the session is over', () => {
    it('files a serious report against a COMPLETED booking without rewriting it', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });

      const res = await report(user.token, booking.id, {
        issueType: 'MISLEADING_LISTING',
        description: 'The listing advertised covered parking and none of it is covered.',
      }).expect(201);

      // Nothing left to freeze, so the session keeps its own record...
      expect(res.body.data.bookingProtected).toBe(false);
      expect(res.body.data.bookingStatus).toBe('COMPLETED');

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(stored.status).toBe('COMPLETED');

      // ...but the lot is still held to account for it.
      expect(res.body.data.openSeriousReports).toBe(1);
      const storedLot = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(storedLot.availabilityConfidence).toBe('MEDIUM');
    });

    it('files a serious report against an EXPIRED booking', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED' },
      });

      // The user who never got in because the lot was shut is exactly who
      // needs this path.
      const res = await report(user.token, booking.id, {
        issueType: 'LOT_CLOSED',
        description: 'Gates were shut the whole time and I could never get in.',
      }).expect(201);

      expect(res.body.data.bookingProtected).toBe(false);
      expect(res.body.data.openSeriousReports).toBe(1);

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(stored.status).toBe('EXPIRED');
    });

    it('escalates the lot on two late serious reports', async () => {
      const { lot } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');

      await prisma.booking.updateMany({
        where: { id: { in: [first.booking.id, second.booking.id] } },
        data: { status: 'COMPLETED' },
      });

      await report(first.user.token, first.booking.id).expect(201);
      const res = await report(second.user.token, second.booking.id).expect(201);

      expect(res.body.data.lotUnderReview).toBe(true);
      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('UNDER_REVIEW');
    });

    it('still refuses to report a cancelled booking', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      await report(user.token, booking.id).expect(409);
    });
  });

  describe('lot reliability', () => {
    it('drops to MEDIUM on one open serious report and stays bookable', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');

      await report(user.token, booking.id).expect(201);

      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.availabilityConfidence).toBe('MEDIUM');
      expect(stored.status).toBe('ACTIVE');
    });

    it('goes UNDER_REVIEW and LOW on two open serious reports', async () => {
      const { lot } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');

      await report(first.user.token, first.booking.id).expect(201);
      const res = await report(second.user.token, second.booking.id).expect(201);

      expect(res.body.data.lotUnderReview).toBe(true);
      expect(res.body.data.openSeriousReports).toBe(2);

      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('UNDER_REVIEW');
      expect(stored.availabilityConfidence).toBe('LOW');
      expect(stored.underReviewSince).not.toBeNull();
      expect(stored.statusBeforeReview).toBe('ACTIVE');
    });

    it('never escalates a lot the owner already took down, and says so', async () => {
      const { lot } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');

      await prisma.parkingLot.update({
        where: { id: lot.id },
        data: { status: 'INACTIVE' },
      });

      await report(first.user.token, first.booking.id).expect(201);
      const res = await report(second.user.token, second.booking.id).expect(201);

      // The counts want a review, but the guard refuses to overwrite the
      // owner's own takedown — so the response must not claim otherwise.
      expect(res.body.data.openSeriousReports).toBe(2);
      expect(res.body.data.lotUnderReview).toBe(false);

      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('INACTIVE');
      expect(stored.availabilityConfidence).toBe('LOW');
      expect(stored.underReviewSince).toBeNull();
    });

    it('pulls a lot under review out of search and blocks new bookings', async () => {
      const { lot } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');
      await report(first.user.token, first.booking.id).expect(201);
      await report(second.user.token, second.booking.id).expect(201);

      const search = await request(app).get('/api/parking-lots').expect(200);
      const ids = (search.body.data.items ?? search.body.data).map(
        (item: { id: string }) => item.id,
      );
      expect(ids).not.toContain(lot.id);

      const third = await createUser('c@example.com', 'USER');
      const vehicle = await createVehicleRecord(third.user.id, { registration: 'KA01AB3333' });
      const res = await request(app)
        .post('/api/bookings')
        .set(auth(third.token))
        .send({ parkingLotId: lot.id, vehicleId: vehicle.id, durationMinutes: 120 })
        .expect(409);
      expect(res.body.message).toMatch(/not active/i);
    });

    it('restores the lot once an admin resolves the reports', async () => {
      const { lot, admin } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');
      const r1 = await report(first.user.token, first.booking.id).expect(201);
      const r2 = await report(second.user.token, second.booking.id).expect(201);

      await request(app)
        .patch(`/api/admin/complaints/${r1.body.data.report.id}/status`)
        .set(auth(admin.token))
        .send({ status: 'RESOLVED', resolutionNote: 'Owner corrected the space count.' })
        .expect(200);

      // One still open -> back to ACTIVE/MEDIUM, not yet fully trusted.
      let stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('ACTIVE');
      expect(stored.availabilityConfidence).toBe('MEDIUM');

      await request(app)
        .patch(`/api/admin/complaints/${r2.body.data.report.id}/status`)
        .set(auth(admin.token))
        .send({ status: 'RESOLVED' })
        .expect(200);

      stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('ACTIVE');
      expect(stored.availabilityConfidence).toBe('HIGH');
      expect(stored.underReviewSince).toBeNull();
    });

    it('keeps the booking DISPUTED after the report is resolved', async () => {
      const { lot, admin } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const res = await report(user.token, booking.id).expect(201);

      await request(app)
        .patch(`/api/admin/complaints/${res.body.data.report.id}/status`)
        .set(auth(admin.token))
        .send({ status: 'RESOLVED' })
        .expect(200);

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(stored.status).toBe('DISPUTED');
    });

    it('stops the owner from lifting their own lot out of review', async () => {
      const { lot, owner } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');
      await report(first.user.token, first.booking.id).expect(201);
      await report(second.user.token, second.booking.id).expect(201);

      const res = await request(app)
        .patch(`/api/parking-lots/${lot.id}`)
        .set(auth(owner.token))
        .send({ status: 'ACTIVE' })
        .expect(409);

      expect(res.body.message).toMatch(/under review/i);

      const stored = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(stored.status).toBe('UNDER_REVIEW');
    });
  });

  describe('accountability', () => {
    it('shows the owner the reports filed against their lots', async () => {
      const { lot, owner } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      await report(user.token, booking.id).expect(201);

      const res = await request(app)
        .get('/api/continuity/owner/reports')
        .set(auth(owner.token))
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].parkingLot.id).toBe(lot.id);
      expect(res.body.data.items[0].booking.id).toBe(booking.id);
      expect(res.body.data.items[0].issueType).toBe('SPACE_UNAVAILABLE');
    });

    it('lets an owner acknowledge a report but not close it', async () => {
      const { lot, owner } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const filed = await report(user.token, booking.id).expect(201);
      const reportId = filed.body.data.report.id;

      await request(app)
        .patch(`/api/continuity/reports/${reportId}`)
        .set(auth(owner.token))
        .send({ status: 'IN_REVIEW' })
        .expect(200);

      const closed = await request(app)
        .patch(`/api/continuity/reports/${reportId}`)
        .set(auth(owner.token))
        .send({ status: 'RESOLVED' })
        .expect(403);
      expect(closed.body.message).toMatch(/only an admin can close/i);

      // Acknowledging keeps the report open, so the lot's score is unchanged.
      const storedLot = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
      expect(storedLot.availabilityConfidence).toBe('MEDIUM');
    });

    it('stops an owner from touching another owner\'s report', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const filed = await report(user.token, booking.id).expect(201);

      const otherOwner = await createUser('owner3@example.com', 'OWNER');
      await request(app)
        .patch(`/api/continuity/reports/${filed.body.data.report.id}`)
        .set(auth(otherOwner.token))
        .send({ status: 'IN_REVIEW' })
        .expect(403);
    });

    it('does not leak another owner\'s reports', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      await report(user.token, booking.id).expect(201);

      const otherOwner = await createUser('owner2@example.com', 'OWNER');
      const res = await request(app)
        .get('/api/continuity/owner/reports')
        .set(auth(otherOwner.token))
        .expect(200);

      expect(res.body.data.total).toBe(0);
    });

    it('counts disputes and lots under review on the admin dashboard', async () => {
      const { lot, admin } = await setup();
      const first = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const second = await bookAs('b@example.com', lot.id, 'KA01AB2222');
      await report(first.user.token, first.booking.id).expect(201);
      await report(second.user.token, second.booking.id).expect(201);

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set(auth(admin.token))
        .expect(200);

      expect(res.body.data.disputedBookings).toBe(2);
      expect(res.body.data.lotsUnderReview).toBe(1);
      expect(res.body.data.openSeriousReports).toBe(2);
    });

    it('reports lot reliability to the owner', async () => {
      const { lot, owner } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      await report(user.token, booking.id).expect(201);

      const res = await request(app)
        .get(`/api/continuity/lots/${lot.id}/reliability`)
        .set(auth(owner.token))
        .expect(200);

      expect(res.body.data.availabilityConfidence).toBe('MEDIUM');
      expect(res.body.data.openSeriousReports).toBe(1);
      expect(res.body.data.timeline.length).toBeGreaterThan(0);
    });
  });

  describe('the ledger', () => {
    it('records the whole life of a booking in order', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      await report(user.token, booking.id).expect(201);

      const res = await request(app)
        .get(`/api/bookings/${booking.id}/timeline`)
        .set(auth(user.token))
        .expect(200);

      const types = res.body.data.map((event: { type: string }) => event.type);
      expect(types).toEqual([
        'BOOKING_CREATED',
        'CAPACITY_HELD',
        'ISSUE_REPORTED',
        'BOOKING_DISPUTED',
        'CAPACITY_RELEASED',
      ]);

      // The confidence drop is a fact about the lot, not about this booking,
      // so it lands on the lot's timeline instead.
      const lotEvents = await prisma.continuityEvent.findMany({
        where: { parkingLotId: lot.id, type: 'LOT_CONFIDENCE_CHANGED' },
      });
      expect(lotEvents).toHaveLength(1);
    });

    it('records who caused each change', async () => {
      const { lot } = await setup();
      const { user, booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      await report(user.token, booking.id).expect(201);

      const disputed = await prisma.continuityEvent.findFirstOrThrow({
        where: { bookingId: booking.id, type: 'BOOKING_DISPUTED' },
      });

      expect(disputed.actorId).toBe(user.user.id);
      expect(disputed.actorRole).toBe('USER');
      expect(disputed.fromStatus).toBe('RESERVED');
      expect(disputed.toStatus).toBe('DISPUTED');
    });

    it('does not show one user another user\'s timeline', async () => {
      const { lot } = await setup();
      const { booking } = await bookAs('a@example.com', lot.id, 'KA01AB1111');
      const other = await createUser('nosy@example.com', 'USER');

      await request(app)
        .get(`/api/bookings/${booking.id}/timeline`)
        .set(auth(other.token))
        .expect(404);
    });
  });
});
