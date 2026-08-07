export type Role = 'USER' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phone?: string | null;
  profileImage?: string | null;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface MeResponse {
  success: boolean;
  user: User;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

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
  success: true;
  data: ParkingLot[];
}

export interface ParkingLotResponse {
  success: true;
  data: ParkingLot;
}
