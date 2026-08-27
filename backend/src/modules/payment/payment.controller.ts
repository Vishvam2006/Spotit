import type { NextFunction, Request, Response } from 'express';
import * as paymentService from './payment.service';
import { createOrderSchema, verifyPaymentSchema } from './payment.validation';

export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createOrderSchema.parse(req.body);
    const order = await paymentService.createOrder(req.user!.id, data);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = verifyPaymentSchema.parse(req.body);
    const result = await paymentService.verifyAndBook(req.user!.id, data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
