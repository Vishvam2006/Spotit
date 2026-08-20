import type { AvailabilityConfidence } from './continuity';

export type ParkingLotStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'UNDER_REVIEW';

export type ParkingSort = 'newest' | 'cheapest' | 'expensive' | 'nearest';

export interface ParkingFilters {
  q?: string;
  city?: string;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: ParkingSort;
  lat?: number;
  lng?: number;
}

/** Owner-management parking shape used by My Parkings feature. */
export interface Parking {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  pricePerHour: number;
  isActive: boolean;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParkingInput {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  pricePerHour: number;
  isActive: boolean;
  photos?: string[];
}

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
  /** Continuity Engine trust signal, recomputed from open serious reports. */
  availabilityConfidence: AvailabilityConfidence;
  /** Set while the engine holds the lot out of circulation. */
  underReviewSince?: string | null;
  imageUrl?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface ParkingLotsResponse {
  success: boolean;
  data: ParkingLot[];
}

export interface ParkingLotResponse {
  success: boolean;
  data: ParkingLot;
}

export interface ParkingResponse {
  success: boolean;
  data: Parking;
}

export interface ParkingsResponse {
  success: boolean;
  data: Parking[];
}