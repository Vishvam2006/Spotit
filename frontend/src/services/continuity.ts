import axios from 'axios';
import { api } from './api';
import type { Paginated } from '../types/admin';
import type { Complaint, ComplaintStatus } from '../types/complaint';
import type {
  ContinuityEvent,
  IssueType,
  LotReliability,
  ReportIssueResult,
} from '../types/continuity';

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(response: Envelope<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Request failed');
  }
  return response.data;
}

export interface EvidenceUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string;
  allowedFormats: readonly string[];
  resourceType: 'image';
}

export interface ReportIssueInput {
  issueType: IssueType;
  description: string;
  photos?: string[];
}

export interface ReportLotIssueInput {
  issueType: IssueType;
  description: string;
  photos?: string[];
  latitude?: number;
  longitude?: number;
}

/** Files an issue against a booking; the engine does the rest server-side. */
export async function reportBookingIssue(
  bookingId: string,
  input: ReportIssueInput,
): Promise<ReportIssueResult> {
  const { data } = await api.post<Envelope<ReportIssueResult>>(
    `/bookings/${bookingId}/report-issue`,
    input,
  );
  return unwrap(data);
}

/** Direct reporting of a parking lot without a booking */
export async function reportLotIssue(
  lotId: string,
  input: ReportLotIssueInput,
): Promise<{ lotUnderReview: boolean; openSeriousReports: number }> {
  const { data } = await api.post<Envelope<{ lotUnderReview: boolean; openSeriousReports: number }>>(
    `/continuity/lots/${lotId}/report`,
    input,
  );
  return unwrap(data);
}

export async function fetchBookingTimeline(
  bookingId: string,
): Promise<ContinuityEvent[]> {
  const { data } = await api.get<Envelope<ContinuityEvent[]>>(
    `/bookings/${bookingId}/timeline`,
  );
  return unwrap(data);
}

export async function fetchLotReliability(
  parkingLotId: string,
): Promise<LotReliability> {
  const { data } = await api.get<Envelope<LotReliability>>(
    `/continuity/lots/${parkingLotId}/reliability`,
  );
  return unwrap(data);
}

export async function fetchOwnerReports(
  params: { page?: number; limit?: number; status?: ComplaintStatus | '' } = {},
): Promise<Paginated<Complaint>> {
  const { data } = await api.get<Envelope<Paginated<Complaint>>>(
    '/continuity/owner/reports',
    { params },
  );
  return unwrap(data);
}

export async function resolveReport(
  reportId: string,
  input: { status: ComplaintStatus; resolutionNote?: string },
): Promise<Complaint> {
  const { data } = await api.patch<Envelope<Complaint>>(
    `/continuity/reports/${reportId}`,
    input,
  );
  return unwrap(data);
}

async function fetchEvidenceUploadSignature(): Promise<EvidenceUploadSignature> {
  const { data } = await api.post<Envelope<EvidenceUploadSignature>>(
    '/uploads/evidence-signature',
  );
  return unwrap(data);
}

/**
 * Uploads one evidence photo straight to Cloudinary using a short-lived signed
 * slot from our API, so the image never passes through — or is stored by — the
 * ParkMitra server, and the API secret stays server-side.
 */
export async function uploadEvidencePhoto(file: File): Promise<string> {
  const signature = await fetchEvidenceUploadSignature();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', signature.folder);
  formData.append('transformation', signature.transformation);
  formData.append('allowed_formats', signature.allowedFormats.join(','));
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);

  const { data } = await axios.post<{ secure_url: string }>(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    formData,
  );

  return data.secure_url;
}
