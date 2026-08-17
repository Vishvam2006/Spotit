import { z } from 'zod';

export const createComplaintSchema = z.object({
  category: z.string().trim().min(1, 'Category is required').max(100),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  parkingLotId: z.string().trim().min(1).optional(),
  bookingId: z.string().trim().min(1).optional(),
});

export const myComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type MyComplaintsQuery = z.infer<typeof myComplaintsQuerySchema>;