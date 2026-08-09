import { api } from './api';
import type { Booking } from '../types/booking';

export interface CreateBookingPayload {
  parkingLotId: string;
  vehicleNumber: string;
  durationMinutes: number;
}

export interface LocationSamplePayload {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
  speedMps?: number;
}

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

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<Booking> {
  const { data } = await api.post<Envelope>('/bookings', payload);
  return unwrap<Booking>(data);
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get<Envelope>('/bookings');
  return unwrap<Booking[]>(data);
}

export async function fetchBooking(id: string): Promise<Booking> {
  const { data } = await api.get<Envelope>(`/bookings/${id}`);
  return unwrap<Booking>(data);
}

export async function checkInBooking(
  id: string,
  sample?: LocationSamplePayload,
): Promise<Booking> {
  const { data } = await api.post<Envelope>(`/bookings/${id}/check-in`, sample ?? {});
  return unwrap<Booking>(data);
}

export async function checkOutBooking(
  id: string,
  sample?: LocationSamplePayload,
): Promise<Booking> {
  const { data } = await api.post<Envelope>(`/bookings/${id}/check-out`, sample ?? {});
  return unwrap<Booking>(data);
}

export async function heartbeatBooking(
  id: string,
  sample?: LocationSamplePayload,
): Promise<Booking> {
  const { data } = await api.post<Envelope>(`/bookings/${id}/heartbeat`, sample ?? {});
  return unwrap<Booking>(data);
}

export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await api.post<Envelope>(`/bookings/${id}/cancel`);
  return unwrap<Booking>(data);
}
