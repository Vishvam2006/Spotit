import type { NextFunction, Request, Response } from 'express';
import * as reassignmentService from './reassignment.service';

export async function getPendingReassignment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const offer = await reassignmentService.getPendingReassignmentForUser(req.user!.id);
    res.json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
}

export async function declineReassignment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await reassignmentService.declineReassignment(req.user!.id, String(req.params.id));
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
