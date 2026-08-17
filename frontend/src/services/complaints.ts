import { api } from './api';
import type { Paginated } from '../types/admin';
import type { Complaint } from '../types/complaint';

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

export interface CreateComplaintInput {
  category: string;
  subject: string;
  description: string;
  parkingLotId?: string;
  bookingId?: string;
}

export async function createComplaint(
  input: CreateComplaintInput,
): Promise<Complaint> {
  const { data } = await api.post<Envelope<Complaint>>('/complaints', input);
  return unwrap(data);
}

export async function fetchMyComplaints(
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<Complaint>> {
  const { data } = await api.get<Envelope<Paginated<Complaint>>>('/complaints', {
    params,
  });
  return unwrap(data);
}