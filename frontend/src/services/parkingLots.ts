import { api } from './api';
import type { ParkingLot, ParkingLotResponse, ParkingLotsResponse } from '../types';

export async function fetchParkingLots(): Promise<ParkingLot[]> {
  const { data } = await api.get<ParkingLotsResponse>('/parking-lots');
  return data.data;
}

export async function fetchParkingLotById(id: string): Promise<ParkingLot> {
  const { data } = await api.get<ParkingLotResponse>(`/parking-lots/${id}`);
  return data.data;
}
