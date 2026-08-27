import { api } from './api';

export interface CreateOrderPayload {
  parkingLotId: string;
  vehicleId: string;
  durationMinutes: number;
}

export interface CreateOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  parkingLotName: string;
}

export interface VerifyPaymentPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  parkingLotId: string;
  vehicleId: string;
  durationMinutes: number;
}

export interface PaymentInfo {
  razorpayPaymentId: string;
  amount: number;
  status: string;
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

export async function createPaymentOrder(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  const { data } = await api.post<Envelope>('/payments/create-order', payload);
  return unwrap<CreateOrderResponse>(data);
}

export async function verifyPayment(
  payload: VerifyPaymentPayload,
): Promise<{ booking: unknown; payment: PaymentInfo }> {
  const { data } = await api.post<Envelope>('/payments/verify', payload);
  return unwrap<{ booking: unknown; payment: PaymentInfo }>(data);
}
