import { z } from 'zod';

export const createOrderSchema = z.object({
  parkingLotId: z.string().min(1),
  vehicleId: z.string().min(1),
  durationMinutes: z.number().int().min(60).max(480),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  parkingLotId: z.string().min(1),
  vehicleId: z.string().min(1),
  durationMinutes: z.number().int().min(60).max(480),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const verifyReassignmentPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyReassignmentPaymentInput = z.infer<typeof verifyReassignmentPaymentSchema>;
