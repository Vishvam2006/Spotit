import type { NextFunction, Request, Response } from 'express';
import * as bookingService from './booking.service';
import type { LocationSample } from './booking.geofence';
import { createBookingSchema, locationSampleSchema } from './booking.validation';

function parseLocationSample(body: unknown): LocationSample | undefined {
  const parsed = locationSampleSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  const { capturedAt, ...rest } = parsed.data;
  return { ...rest, capturedAt: new Date(capturedAt) };
}

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await bookingService.createBooking(req.user!.id, data);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function getBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookings = await bookingService.getBookings(req.user!.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await bookingService.getBookingById(
      req.user!.id,
      String(req.params.id),
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function checkInBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await bookingService.checkInBooking(
      req.user!.id,
      String(req.params.id),
      parseLocationSample(req.body),
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function checkOutBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await bookingService.checkOutBooking(
      req.user!.id,
      String(req.params.id),
      parseLocationSample(req.body),
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await bookingService.cancelBooking(
      req.user!.id,
      String(req.params.id),
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}
