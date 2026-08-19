import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import * as continuityService from './continuity.service';
import { ContinuityError } from './continuity.states';
import { getBookingTimeline, getLotTimeline } from './continuity.events';
import {
  reportIssueSchema,
  reportLotIssueSchema,
  reportListQuerySchema,
  resolveReportSchema,
} from './continuity.validation';

/** POST /api/bookings/:id/report-issue */
export async function reportBookingIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = reportIssueSchema.parse(req.body);
    const result = await continuityService.reportBookingIssue(
      req.user!.id,
      String(req.params.id),
      input,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /api/continuity/lots/:id/report */
export async function reportLotIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = reportLotIssueSchema.parse(req.body);
    const result = await continuityService.reportLotIssue(
      req.user!.id,
      String(req.params.id),
      input,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/bookings/:id/timeline */
export async function getBookingTimelineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookingId = String(req.params.id);

    // Users see only their own booking's history; admins see any.
    const where =
      req.user!.role === 'ADMIN'
        ? { id: bookingId }
        : { id: bookingId, userId: req.user!.id };

    const booking = await prisma.booking.findFirst({ where, select: { id: true } });

    if (!booking) {
      throw new ContinuityError(404, 'Booking not found');
    }

    const events = await getBookingTimeline(bookingId);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}

/** GET /api/continuity/lots/:id/reliability — owner of the lot, or admin. */
export async function getLotReliabilityHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parkingLotId = String(req.params.id);

    const lot = await prisma.parkingLot.findUnique({
      where: { id: parkingLotId },
      select: { ownerId: true },
    });

    if (!lot) {
      throw new ContinuityError(404, 'Parking lot not found');
    }

    if (req.user!.role !== 'ADMIN' && lot.ownerId !== req.user!.id) {
      throw new ContinuityError(403, 'You do not manage this parking lot.');
    }

    const [reliability, timeline] = await Promise.all([
      continuityService.getLotReliability(parkingLotId),
      getLotTimeline(parkingLotId),
    ]);

    res.json({ success: true, data: { ...reliability, timeline } });
  } catch (error) {
    next(error);
  }
}

/** GET /api/continuity/owner/reports */
export async function getOwnerReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = reportListQuerySchema.parse(req.query);
    const result = await continuityService.getOwnerReports(req.user!.id, query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/continuity/reports/:id — owner acknowledges, admin decides. */
export async function resolveReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = resolveReportSchema.parse(req.body);
    const report = await continuityService.resolveReport(
      req.user!.id,
      req.user!.role,
      String(req.params.id),
      input,
    );
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}
