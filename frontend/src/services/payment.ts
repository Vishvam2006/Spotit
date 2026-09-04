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

export interface VerifyReassignmentPaymentPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

/** Creates a fresh order for a still-PENDING offer (the explicit-accept path). */
export async function createReassignmentOrder(
  reassignmentId: string,
): Promise<CreateOrderResponse> {
  const { data } = await api.post<Envelope>(
    `/payments/reassignment/${reassignmentId}/create-order`,
  );
  return unwrap<CreateOrderResponse>(data);
}

/**
 * Verifies payment for a reassignment offer. Handles both the explicit-accept
 * path (offer still PENDING) and the deferred-payment path (offer already
 * AUTO_ACCEPTED at timeout, capturing the order the backend pre-created) --
 * the backend decides which case applies.
 */
export async function verifyReassignmentPayment(
  reassignmentId: string,
  payload: VerifyReassignmentPaymentPayload,
): Promise<{ booking: unknown; payment: PaymentInfo }> {
  const { data } = await api.post<Envelope>(
    `/payments/reassignment/${reassignmentId}/verify`,
    payload,
  );
  return unwrap<{ booking: unknown; payment: PaymentInfo }>(data);
}
