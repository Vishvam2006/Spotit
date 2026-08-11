import axios from 'axios';
import { api, getErrorMessage } from './api';
import type {
  Parking,
  ParkingInput,
  ParkingLot,
  ParkingLotStatus,
  ParkingLotResponse,
  ParkingLotsResponse,
} from '../types/parking';

function toParking(lot: ParkingLot): Parking {
  return {
    id: lot.id,
    ownerId: lot.ownerId,
    name: lot.name,
    description: lot.description ?? null,
    address: lot.address,
    latitude: lot.latitude,
    longitude: lot.longitude,
    totalSlots: lot.totalSpaces,
    availableSlots: lot.availableSpaces,
    pricePerHour: lot.pricePerHour,
    isActive: lot.status === 'ACTIVE',
    photos: lot.photos ?? [],
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
  };
}

function toWirePayload(data: ParkingInput) {
  return {
    name: data.name,
    description: data.description,
    address: data.address,
    city: data.address.split(',')[0]?.trim() || data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    pricePerHour: data.pricePerHour,
    totalSpaces: data.totalSlots,
    availableSpaces: data.availableSlots,
    status: (data.isActive ? 'ACTIVE' : 'INACTIVE') as ParkingLotStatus,
    photos: data.photos,
  };
}

export function getParkingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403) {
      return message ?? 'You are not allowed to perform this action.';
    }

    if (status === 409) {
      return message ?? 'This action conflicts with existing data.';
    }

    return message ?? error.message ?? 'Something went wrong. Please try again.';
  }

  return getErrorMessage(error);
}

export async function getMyParkings(): Promise<Parking[]> {
  const { data } = await api.get<ParkingLotsResponse>('/parking-lots/mine');
  return data.data.map((lot) => toParking(lot));
}

export async function createParking(payload: ParkingInput): Promise<Parking> {
  const { data } = await api.post<ParkingLotResponse>('/parking-lots', toWirePayload(payload));
  return toParking(data.data);
}

export async function updateParking(id: string, payload: ParkingInput): Promise<Parking> {
  const { data } = await api.patch<ParkingLotResponse>(
    `/parking-lots/${id}`,
    toWirePayload(payload),
  );
  return toParking(data.data);
}

export async function toggleParking(id: string, isActive: boolean): Promise<Parking> {
  try {
    const { data } = await api.patch<ParkingLotResponse>(`/parking-lots/${id}/status`, {
      isActive,
    });
    return toParking(data.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const { data } = await api.patch<ParkingLotResponse>(`/parking-lots/${id}`, {
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      });
      return toParking(data.data);
    }
    throw error;
  }
}

export async function deleteParking(id: string): Promise<void> {
  await api.delete(`/parking-lots/${id}`);
}
