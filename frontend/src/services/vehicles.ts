import { api } from './api';
import type { Vehicle, VehicleType } from '../types/vehicle';

export interface VehicleUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string;
  allowedFormats: readonly string[];
  resourceType: 'image';
}

export interface VehicleImageClaim {
  imageUrl: string;
  imagePublicId: string;
}

export interface CreateVehiclePayload {
  registration: string;
  type: VehicleType;
  imageUrl: string;
  imagePublicId: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  isDefault?: boolean;
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

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

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<Envelope>('/vehicles');
  return unwrap<Vehicle[]>(data);
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const { data } = await api.post<Envelope>('/vehicles', payload);
  return unwrap<Vehicle>(data);
}

export async function updateVehicle(
  id: string,
  payload: UpdateVehiclePayload,
): Promise<Vehicle> {
  const { data } = await api.patch<Envelope>(`/vehicles/${id}`, payload);
  return unwrap<Vehicle>(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { data } = await api.delete<Envelope>(`/vehicles/${id}`);
  if (data && !data.success) {
    throw new Error(data.message ?? 'Request failed');
  }
}

export async function setDefaultVehicle(id: string): Promise<Vehicle[]> {
  const { data } = await api.post<Envelope>(`/vehicles/${id}/default`);
  return unwrap<Vehicle[]>(data);
}

export async function fetchVehicleUploadSignature(): Promise<VehicleUploadSignature> {
  const { data } = await api.post<Envelope>('/uploads/vehicle-image-signature');
  return unwrap<VehicleUploadSignature>(data);
}
