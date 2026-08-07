export type ParkingLotStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export interface ParkingLot {
  id: string;
  ownerId: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ParkingLotsResponse {
  success: boolean;
  data: ParkingLot[];
}