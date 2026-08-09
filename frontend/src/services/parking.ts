import { api } from './api';
import type { ParkingLot, ParkingLotResponse, ParkingLotsResponse, ParkingLotStatus } from '../types/parking';

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const { data } = await api.get<ParkingLotsResponse>('/parking-lots');
  return data.data;
}

export async function fetchMyParkingLots(): Promise<ParkingLot[]> {
  const { data } = await api.get<ParkingLotsResponse>('/parking-lots/mine');
  return data.data;
}

export async function fetchParkingLot(id: string): Promise<ParkingLot> {
  const { data } = await api.get<ParkingLotResponse>(`/parking-lots/${id}`);
  return data.data;
}

export interface CreateParkingPayload {
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  totalSpaces: number;
  availableSpaces: number;
  status: ParkingLotStatus;
  imageUrl?: string;
}

interface CreateParkingResponse {
  success: boolean;
  data: ParkingLot;
}

export async function createParkingLot(
  payload: CreateParkingPayload,
): Promise<ParkingLot> {
  const { data } = await api.post<CreateParkingResponse>('/parking-lots', payload);
  return data.data;
}