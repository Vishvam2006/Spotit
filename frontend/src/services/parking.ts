import { api } from './api';
import type {
  ParkingFilters,
  ParkingLot,
  ParkingLotResponse,
  ParkingLotsResponse,
  ParkingLotStatus,
} from '../types/parking';

function buildQueryParams(filters: ParkingFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  if (filters.q?.trim()) params.q = filters.q.trim();
  if (filters.city) params.city = filters.city;
  if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
  if (filters.availableOnly) params.availableOnly = filters.availableOnly;
  if (filters.sort) params.sort = filters.sort;
  if (filters.lat !== undefined) params.lat = filters.lat;
  if (filters.lng !== undefined) params.lng = filters.lng;

  return params;
}

export async function fetchParkingLots(filters: ParkingFilters = {}): Promise<ParkingLot[]> {
  const { data } = await api.get<ParkingLotsResponse>('/parking-lots', {
    params: buildQueryParams(filters),
  });
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