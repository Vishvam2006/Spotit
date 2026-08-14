import { api } from './api';

export interface VerificationResultData {
  status: 'VERIFIED' | 'MISMATCH' | 'PARTIALLY_MATCHED' | 'EXPIRED' | 'OCR_FAILED' | 'UNKNOWN_DOCUMENT' | 'PROCESSING_ERROR';
  document_type: 'DRIVING_LICENSE' | 'RC' | 'UNKNOWN';
  confidence: number;
  checks?: Record<string, string>;
  message?: string;
}

interface Envelope {
  success: boolean;
  data?: VerificationResultData;
  message?: string;
}

export async function verifyDocumentApi(
  file: File,
  documentType: 'DRIVING_LICENSE' | 'RC',
  dateOfBirth?: string,
): Promise<VerificationResultData> {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('document_type', documentType);
  if (dateOfBirth) {
    formData.append('date_of_birth', dateOfBirth);
  }

  const { data } = await api.post<Envelope>('/verification/document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'Verification failed');
  }

  return data.data;
}
