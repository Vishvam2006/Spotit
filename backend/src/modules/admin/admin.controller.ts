import type { NextFunction, Request, Response } from 'express';
import * as adminService from './admin.service';
import {
  bookingListQuerySchema,
  complaintListQuerySchema,
  complaintStatusUpdateSchema,
} from './admin.validation';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await adminService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
}

export async function getComplaints(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = complaintListQuerySchema.parse(req.query);
    const result = await adminService.getComplaints(query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await adminService.getComplaintById(String(req.params.id));
    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
}

export async function updateComplaintStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = complaintStatusUpdateSchema.parse(req.body);
    const complaint = await adminService.updateComplaintStatus(
      req.user!.id,
      String(req.params.id),
      data.status,
      data.resolutionNote,
    );
    res.json({ success: true, data: complaint });
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
    const query = bookingListQuerySchema.parse(req.query);
    const result = await adminService.getBookings(query);
    res.json({ success: true, data: result });
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
    const booking = await adminService.getBookingById(String(req.params.id));
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}