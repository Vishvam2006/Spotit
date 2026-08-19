import { z } from 'zod';
import { ComplaintStatus, IssueType } from '@prisma/client';

/** Cloudinary secure URLs only — evidence must live where we put it. */
const evidencePhotoSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith('https://res.cloudinary.com/'), {
    message: 'Photo evidence must be uploaded through ParkMitra.',
  });

export const reportIssueSchema = z.object({
  issueType: z.nativeEnum(IssueType),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the issue in at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  photos: z.array(evidencePhotoSchema).max(5, 'You can attach up to 5 photos').optional(),
});

export const resolveReportSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  resolutionNote: z.string().trim().max(1000).optional(),
});

export const reportListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ComplaintStatus).optional(),
});

export const reportLotIssueSchema = z.object({
  issueType: z.nativeEnum(IssueType),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the issue in at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  photos: z.array(evidencePhotoSchema).max(5, 'You can attach up to 5 photos').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type ReportIssueInput = z.infer<typeof reportIssueSchema>;
export type ReportLotIssueInput = z.infer<typeof reportLotIssueSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
