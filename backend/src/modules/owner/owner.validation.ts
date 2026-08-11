import { z } from 'zod';

export const ownerBookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type OwnerBookingsQuery = z.infer<typeof ownerBookingsQuerySchema>;