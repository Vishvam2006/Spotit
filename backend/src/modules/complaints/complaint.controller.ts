import type { NextFunction, Request, Response } from 'express';
import * as complaintService from './complaint.service';
import {
  createComplaintSchema,
  myComplaintsQuerySchema,
} from './complaint.validation';

export async function createComplaint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createComplaintSchema.parse(req.body);
    const complaint = await complaintService.createComplaint(req.user!.id, data);
    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
}

export async function getMyComplaints(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = myComplaintsQuerySchema.parse(req.query);
    const result = await complaintService.getMyComplaints(req.user!.id, query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMyComplaintById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await complaintService.getMyComplaintById(
      req.user!.id,
      String(req.params.id),
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
}