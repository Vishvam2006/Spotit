import { api } from './api';
import type {
  AdminBooking,
  AdminDashboard,
  BookingStatus,
  Paginated,
} from '../types/admin';
import type { Complaint, ComplaintStatus } from '../types/complaint';

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

export interface AdminBookingsParams {
  page?: number;
  limit?: number;
  status?: BookingStatus | '';
  parkingId?: string;
  date?: string;
  search?: string;
}

export interface AdminComplaintsParams {
  page?: number;
  limit?: number;
  status?: ComplaintStatus | '';
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<Envelope<AdminDashboard>>('/admin/dashboard');
  return unwrap(data);
}

export async function fetchAdminComplaints(
  params: AdminComplaintsParams = {},
): Promise<Paginated<Complaint>> {
  const { data } = await api.get<Envelope<Paginated<Complaint>>>(
    '/admin/complaints',
    { params },
  );
  return unwrap(data);
}

export async function fetchAdminComplaint(id: string): Promise<Complaint> {
  const { data } = await api.get<Envelope<Complaint>>(`/admin/complaints/${id}`);
  return unwrap(data);
}

export async function updateAdminComplaintStatus(
  id: string,
  status: ComplaintStatus,
): Promise<Complaint> {
  const { data } = await api.patch<Envelope<Complaint>>(
    `/admin/complaints/${id}/status`,
    { status },
  );
  return unwrap(data);
}

export async function fetchAdminBookings(
  params: AdminBookingsParams = {},
): Promise<Paginated<AdminBooking>> {
  const { data } = await api.get<Envelope<Paginated<AdminBooking>>>(
    '/admin/bookings',
    { params },
  );
  return unwrap(data);
}