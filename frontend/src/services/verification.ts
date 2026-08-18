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

export type CheckOutcome = 'PASS' | 'FAIL' | 'WARN' | 'SKIPPED' | 'UNKNOWN';

export interface CheckResultItem {
  id: string;
  label: string;
  status: CheckOutcome;
  rawStatus?: string;
  /** A sentence naming the actual values compared, e.g. "Expired on 15 May 2020". */
  detail: string;
}

export interface FieldReading {
  id: string;
  label: string;
  /** Normalized value, e.g. GJ01AB1234. */
  value?: string | null;
  /** What the model read, when it differs from `value` (shows OCR correction). */
  rawValue?: string | null;
  /** The account/garage value this was compared against, when one exists. */
  expected?: string | null;
  state?: CheckOutcome;
}

export interface ConfidenceBreakdown {
  fieldCompleteness: number;
  normalization: number;
  validatorAgreement: number;
  legibility: number;
  documentTypeCertainty: number;
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
  // Added by engine 2.0. Optional so an older engine response still type-checks.
  documentTypeLabel?: string;
  statusLabel?: string;
  engineStatus?: string;
  engineAvailable?: boolean;
  confidenceLabel?: string;
  confidenceBreakdown?: ConfidenceBreakdown;
  checkResults?: CheckResultItem[];
  fields?: FieldReading[];
  diagnostics?: {
    modelUsed?: string | null;
    attempts?: number;
    latencyMs?: number;
    failureReason?: string | null;
  };
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
  engineVersion?: string;
  /** False when the engine could not be reached: nothing was checked. */
  engineAvailable?: boolean;
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

export interface VerifyOptions {
  /** Lets the user cancel an in-flight analysis. */
  signal?: AbortSignal;
  /** Real upload progress, 0-100, for the phase we can actually measure. */
  onUploadProgress?: (percent: number) => void;
}

export async function verifyUploadedDocuments(
  payload: VerifyPayload,
  options: VerifyOptions = {},
): Promise<VerificationResultData> {
  const timeout = Math.max(
    VERIFY_MIN_TIMEOUT_MS,
    payload.files.length * VERIFY_TIMEOUT_PER_FILE_MS,
  );

  const { data } = await api.post<{ success: boolean; data: VerificationResultData }>(
    '/verification/verify',
    payload,
    {
      timeout,
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!options.onUploadProgress || !event.total) return;
        options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    },
  );
  if (!data.success || !data.data) {
    throw new Error('Verification request failed. Please check document images.');
  }
  return data.data;
}
