import { api } from './api';
import type { ReassignmentOffer } from '../types/reassignment';

interface Envelope {
  success: boolean;
  data?: unknown;
  message?: string;
}

function unwrap<T>(response: Envelope): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Request failed');
  }
  return response.data as T;
}

export async function fetchPendingReassignment(): Promise<ReassignmentOffer | null> {
  const { data } = await api.get<Envelope>('/reassignments/pending');
  return unwrap<ReassignmentOffer | null>(data);
}

export async function declineReassignment(reassignmentId: string): Promise<void> {
  const { data } = await api.post<Envelope>(`/reassignments/${reassignmentId}/decline`);
  unwrap<null>(data);
}
