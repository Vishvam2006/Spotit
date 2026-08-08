import { api } from './api';
import type { Booking, BookingResponse, BookingsResponse } from '../types/booking';

export interface CreateBookingPayload {
  parkingLotId: string;
  vehicleNumber: string;
  durationMinutes: number;
}

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<Booking> {
  const { data } = await api.post<BookingResponse>('/bookings', payload);
  return data.data;
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get<BookingsResponse>('/bookings');
  return data.data;
}

export async function fetchBooking(id: string): Promise<Booking> {
  const { data } = await api.get<BookingResponse>(`/bookings/${id}`);
  return data.data;
}

export async function checkInBooking(id: string): Promise<Booking> {
  const { data } = await api.post<BookingResponse>(`/bookings/${id}/check-in`);
  return data.data;
}

export async function checkOutBooking(id: string): Promise<Booking> {
  const { data } = await api.post<BookingResponse>(`/bookings/${id}/check-out`);
  return data.data;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await api.post<BookingResponse>(`/bookings/${id}/cancel`);
  return data.data;
}
