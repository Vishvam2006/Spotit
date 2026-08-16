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

export async function verifyUploadedDocuments(payload: VerifyPayload): Promise<VerificationResultData> {
  const { data } = await api.post<{ success: boolean; data: VerificationResultData }>('/verification/verify', payload);
  if (!data.success || !data.data) {
    throw new Error('Verification request failed. Please check document images.');
  }
  return data.data;
}

export async function verifyDocumentApi(
  file: File,
  documentType: 'DRIVING_LICENSE' | 'RC',
  dateOfBirth?: string,
): Promise<VerificationResultData> {
  const reader = new FileReader();
  const base64: string = await new Promise((resolve, reject) => {
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return verifyUploadedDocuments({
    files: [{ name: file.name, data: base64 }],
  });
}
