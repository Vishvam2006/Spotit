import type { NextFunction, Request, Response } from 'express';
import * as ownerService from './owner.service';
import { ownerBookingsQuerySchema } from './owner.validation';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await ownerService.getDashboard(req.user!.id);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
}

export async function getRevenue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const revenue = await ownerService.getRevenue(req.user!.id);
    res.json({ success: true, data: revenue });
  } catch (error) {
    next(error);
  }
}

export async function getOwnerParkings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parkings = await ownerService.getOwnerParkings(req.user!.id);
    res.json({ success: true, data: parkings });
  } catch (error) {
    next(error);
  }
}

export async function getParkingStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await ownerService.getParkingStatus(
      req.user!.id,
      String(req.params.id),
    );
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}

export async function getOwnerBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ownerBookingsQuerySchema.parse(req.query);
    const bookings = await ownerService.getOwnerBookings(
      req.user!.id,
      query.limit,
    );
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

export async function getAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const analytics = await ownerService.getOwnerAnalytics(req.user!.id);
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
}