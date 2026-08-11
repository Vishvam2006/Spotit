import { api } from './api';
import type {
  OwnerAnalytics,
  OwnerBookingRow,
  OwnerDashboard,
  OwnerParkingCard,
  OwnerParkingStatus,
  OwnerRevenue,
} from '../types/owner';

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

export async function fetchOwnerDashboard(): Promise<OwnerDashboard> {
  const { data } = await api.get<Envelope<OwnerDashboard>>('/owner/dashboard');
  return unwrap(data);
}

export async function fetchOwnerRevenue(): Promise<OwnerRevenue> {
  const { data } = await api.get<Envelope<OwnerRevenue>>('/owner/revenue');
  return unwrap(data);
}

export async function fetchOwnerParkings(): Promise<OwnerParkingCard[]> {
  const { data } = await api.get<Envelope<OwnerParkingCard[]>>('/owner/parkings');
  return unwrap(data);
}

export async function fetchOwnerParkingStatus(
  id: string,
): Promise<OwnerParkingStatus> {
  const { data } = await api.get<Envelope<OwnerParkingStatus>>(
    `/owner/parkings/${id}/status`,
  );
  return unwrap(data);
}

export async function fetchOwnerBookings(
  limit = 20,
): Promise<OwnerBookingRow[]> {
  const { data } = await api.get<Envelope<OwnerBookingRow[]>>('/owner/bookings', {
    params: { limit },
  });
  return unwrap(data);
}

export async function fetchOwnerAnalytics(): Promise<OwnerAnalytics> {
  const { data } = await api.get<Envelope<OwnerAnalytics>>('/owner/analytics');
  return unwrap(data);
}