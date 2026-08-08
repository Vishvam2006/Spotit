import { z } from 'zod';

export const createBookingSchema = z.object({
  parkingLotId: z.string().min(1),
  vehicleNumber: z.string().trim().min(2).max(20),
  durationMinutes: z.number().int().min(60).max(480),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
