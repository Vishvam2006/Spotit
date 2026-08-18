import { z } from 'zod';

const complaintStatusEnum = z.enum([
  'PENDING',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
]);

const bookingStatusEnum = z.enum([
  'RESERVED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const complaintListQuerySchema = adminListQuerySchema.extend({
  status: complaintStatusEnum.optional(),
});

export const bookingListQuerySchema = adminListQuerySchema.extend({
  status: bookingStatusEnum.optional(),
  parkingId: z.string().trim().min(1).optional(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use the YYYY-MM-DD format')
    .optional(),
  search: z.string().trim().max(200).optional(),
});

export const complaintStatusUpdateSchema = z.object({
  status: complaintStatusEnum,
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
export type ComplaintStatusUpdateInput = z.infer<
  typeof complaintStatusUpdateSchema
>;