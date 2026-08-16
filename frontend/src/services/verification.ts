import { api } from './api';

export interface ExtractedFields {
  documentType: string;
  documentNumber?: string;
  ownerName?: string;
  vehicleNumber?: string;
  vehicleClass?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
}

export interface DocumentResultItem {
  filename: string;
  documentType: string;
  status: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  confidenceScore: number;
  extractedFields: ExtractedFields;
  checks: {
    formatValid: boolean;
    registrationMatch: boolean;
    nameMatch: boolean;
    expiryCheck: boolean;
  };
  summary: string;
}

export interface VerificationResultData {
  success: boolean;
  verificationId: string;
  overallStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  overallConfidence: number;
  documents: DocumentResultItem[];
  targetVehicle?: {
    id: string;
    registration: string;
    make?: string | null;
    model?: string | null;
    type: string;
  } | null;
  summary: string;
}

export interface VerifyPayload {
  files: { name: string; data: string }[];
  vehicleId?: string;
  expectedRegistration?: string;
  expectedName?: string;
}

// Vision-model analysis runs per document and routinely takes far longer than
// the 15s default in api.ts, which would abort a request the engine is still
// working on. Scaled per document, with a floor for a single upload.
const VERIFY_TIMEOUT_PER_FILE_MS = 45_000;
const VERIFY_MIN_TIMEOUT_MS = 60_000;

export async function verifyUploadedDocuments(payload: VerifyPayload): Promise<VerificationResultData> {
  const timeout = Math.max(
    VERIFY_MIN_TIMEOUT_MS,
    payload.files.length * VERIFY_TIMEOUT_PER_FILE_MS,
  );

  const { data } = await api.post<{ success: boolean; data: VerificationResultData }>(
    '/verification/verify',
    payload,
    { timeout },
  );
  if (!data.success || !data.data) {
    throw new Error('Verification request failed. Please check document images.');
  }
  return data.data;
}
