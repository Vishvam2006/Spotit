import { z } from 'zod';
import { BookingStatus, ComplaintStatus } from '@prisma/client';

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const complaintListQuerySchema = adminListQuerySchema.extend({
  status: z.nativeEnum(ComplaintStatus).optional(),
});

export const bookingListQuerySchema = adminListQuerySchema.extend({
  status: z.nativeEnum(BookingStatus).optional(),
  parkingId: z.string().trim().min(1).optional(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use the YYYY-MM-DD format')
    .optional(),
  search: z.string().trim().max(200).optional(),
});

export const complaintStatusUpdateSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
export type ComplaintStatusUpdateInput = z.infer<
  typeof complaintStatusUpdateSchema
>;