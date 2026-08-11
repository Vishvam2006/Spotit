import { z } from 'zod';

export const createBookingSchema = z.object({
  parkingLotId: z.string().min(1),
  vehicleId: z.string().min(1),
  durationMinutes: z.number().int().min(60).max(480),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const locationSampleSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  capturedAt: z.string().datetime(),
  speedMps: z.number().positive().optional(),
});

export type LocationSampleInput = z.infer<typeof locationSampleSchema>;
