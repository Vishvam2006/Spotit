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

const EVIDENCE =
  'https://res.cloudinary.com/parkmitra/image/upload/v1/evidence/bay-occupied.jpg';

/**
 * The demo loop, walked end to end over HTTP exactly as it is presented:
 *
 *   driver books -> driver reports with photo evidence -> booking DISPUTED ->
 *   lot confidence falls -> admin sees the complaint, the evidence and the
 *   timeline -> admin resolves -> lot is re-scored.
 *
 * The per-step rules already have close unit coverage in continuity.test.ts.
 * What this file protects is the seam between those steps: that each stage
 * hands the next one the data it needs, through the real endpoints the UI
 * calls. A regression here breaks the demo even when every rule still holds.
 */
describe('demo loop: driver report to admin resolution', () => {
  beforeEach(resetDb);

  async function setupCast() {
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

    const lot = await createParkingLot(owner.token, {
      name: 'Central Mall Parking',
      totalSpaces: 10,
      availableSpaces: 5,
    });

    return {
      owner,
      admin: { ...admin, token: adminLogin.body.token as string },
      lot,
    };
  }

  async function driverBooks(
    email: string,
    lotId: string,
    registration: string,
    fullName?: string,
  ) {
    const user = await createUser(email, 'USER');
    if (fullName) {
      await prisma.user.update({ where: { id: user.user.id }, data: { fullName } });
    }
    const vehicle = await createVehicleRecord(user.user.id, { registration });
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({ parkingLotId: lotId, vehicleId: vehicle.id, durationMinutes: 120 })
      .expect(201);

    return { user, booking: res.body.data as { id: string; status: string } };
  }

  function reportSpaceUnavailable(token: string, bookingId: string) {
    return request(app)
      .post(`/api/bookings/${bookingId}/report-issue`)
      .set(auth(token))
      .send({
        issueType: 'SPACE_UNAVAILABLE',
        description: 'The bay I reserved already had another car parked in it.',
        photos: [EVIDENCE],
      });
  }

  it('carries one report from booking through to admin resolution', async () => {
    const { admin, lot } = await setupCast();

    // 1. Driver books Central Mall Parking.
    const { user, booking } = await driverBooks(
      'driver@example.com',
      lot.id,
      'KA01AB1111',
      'Asha Rao',
    );
    expect(booking.status).toBe('RESERVED');

    // 2 + 3. Driver reports the space as unavailable, with a photo.
    const reported = await reportSpaceUnavailable(user.token, booking.id).expect(201);

    // 4. The booking is frozen as evidence rather than deleted.
    expect(reported.body.data.bookingStatus).toBe('DISPUTED');
    expect(reported.body.data.bookingProtected).toBe(true);

    // 5. Lot confidence falls on the strength of one open serious report.
    const afterReport = await prisma.parkingLot.findUniqueOrThrow({
      where: { id: lot.id },
    });
    expect(afterReport.availabilityConfidence).toBe('MEDIUM');

    // 6. The complaint reaches the admin dashboard and complaints list.
    const dashboard = await request(app)
      .get('/api/admin/dashboard')
      .set(auth(admin.token))
      .expect(200);
    expect(dashboard.body.data.disputedBookings).toBe(1);
    expect(dashboard.body.data.openSeriousReports).toBe(1);

    const list = await request(app)
      .get('/api/admin/complaints')
      .set(auth(admin.token))
      .expect(200);
    const reportId = reported.body.data.report.id as string;
    expect(list.body.data.items.map((item: { id: string }) => item.id)).toContain(
      reportId,
    );

    // 7. Opening the complaint shows every field the admin decides on, and
    //    makes it obvious this is a real booking, not loose feedback.
    const detail = await request(app)
      .get(`/api/admin/complaints/${reportId}`)
      .set(auth(admin.token))
      .expect(200);
    const complaint = detail.body.data;

    expect(complaint.id).toBe(reportId);
    expect(complaint.user.fullName).toBe('Asha Rao');
    expect(complaint.parkingLot.name).toBe('Central Mall Parking');
    expect(complaint.booking.id).toBe(booking.id);
    expect(complaint.issueType).toBe('SPACE_UNAVAILABLE');
    expect(complaint.severity).toBe('SERIOUS');
    expect(complaint.photos).toEqual([EVIDENCE]);
    expect(complaint.booking.status).toBe('DISPUTED');
    // The two signals that tell an admin how much this lot is already trusted.
    expect(complaint.parkingLot.availabilityConfidence).toBe('MEDIUM');
    expect(complaint.parkingLot.status).toBe('ACTIVE');

    // The admin can pull the same booking's ledger the driver sees.
    const timeline = await request(app)
      .get(`/api/bookings/${booking.id}/timeline`)
      .set(auth(admin.token))
      .expect(200);
    const eventTypes = timeline.body.data.map((e: { type: string }) => e.type);
    expect(eventTypes).toContain('BOOKING_CREATED');
    expect(eventTypes).toContain('ISSUE_REPORTED');
    expect(eventTypes).toContain('BOOKING_DISPUTED');
    expect(eventTypes).toContain('CAPACITY_RELEASED');

    // 8. Admin resolves, leaving a note.
    await request(app)
      .patch(`/api/admin/complaints/${reportId}/status`)
      .set(auth(admin.token))
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Owner confirmed the bay was double-sold. Driver refunded.',
      })
      .expect(200);

    // 9. The lot is re-scored now that nothing is open against it.
    const afterResolution = await prisma.parkingLot.findUniqueOrThrow({
      where: { id: lot.id },
    });
    expect(afterResolution.availabilityConfidence).toBe('HIGH');
    expect(afterResolution.status).toBe('ACTIVE');

    // The frozen booking is never rewritten by the resolution.
    const finalBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(finalBooking.status).toBe('DISPUTED');
  });

  it('escalates to UNDER_REVIEW on a second report and reinstates once cleared', async () => {
    const { admin, lot } = await setupCast();

    const first = await driverBooks('d1@example.com', lot.id, 'KA01AB1111');
    const second = await driverBooks('d2@example.com', lot.id, 'KA01AB2222');

    const r1 = await reportSpaceUnavailable(first.user.token, first.booking.id).expect(201);
    const r2 = await reportSpaceUnavailable(second.user.token, second.booking.id).expect(201);

    expect(r2.body.data.lotUnderReview).toBe(true);
    expect(r2.body.data.openSeriousReports).toBe(2);

    const escalated = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(escalated.status).toBe('UNDER_REVIEW');
    expect(escalated.availabilityConfidence).toBe('LOW');
    expect(escalated.underReviewSince).not.toBeNull();

    // A lot under review is off the map and refuses new bookings, so the demo
    // never shows a driver booking into a lot that is already discredited.
    const search = await request(app).get('/api/parking-lots').expect(200);
    expect(search.body.data.map((l: { id: string }) => l.id)).not.toContain(lot.id);

    // Admin sees both, and the detail view reflects the escalated lot state.
    const detail = await request(app)
      .get(`/api/admin/complaints/${r1.body.data.report.id}`)
      .set(auth(admin.token))
      .expect(200);
    expect(detail.body.data.parkingLot.status).toBe('UNDER_REVIEW');
    expect(detail.body.data.parkingLot.availabilityConfidence).toBe('LOW');

    // Escalation is a threshold, not a latch: clearing one report drops the
    // lot back under two open serious reports, so it returns to circulation
    // immediately -- but at MEDIUM, because one report is still open against it.
    await request(app)
      .patch(`/api/admin/complaints/${r1.body.data.report.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'RESOLVED', resolutionNote: 'Confirmed and settled.' })
      .expect(200);

    const midway = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(midway.status).toBe('ACTIVE');
    expect(midway.availabilityConfidence).toBe('MEDIUM');
    expect(midway.underReviewSince).toBeNull();

    // Clearing the last one restores full confidence.
    await request(app)
      .patch(`/api/admin/complaints/${r2.body.data.report.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'RESOLVED', resolutionNote: 'Confirmed and settled.' })
      .expect(200);

    const reinstated = await prisma.parkingLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(reinstated.status).toBe('ACTIVE');
    expect(reinstated.availabilityConfidence).toBe('HIGH');
    expect(reinstated.underReviewSince).toBeNull();

    const backInSearch = await request(app).get('/api/parking-lots').expect(200);
    expect(backInSearch.body.data.map((l: { id: string }) => l.id)).toContain(lot.id);
  });
});
