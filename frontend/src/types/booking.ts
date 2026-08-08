import type { ParkingLot } from './parking';

export type BookingStatus = 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Booking {
  id: string;
  userId: string;
  parkingLotId: string;
  vehicleNumber: string;
  startTime: string;
  reservedUntil: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  estimatedAmount: number;
  finalAmount: number | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  parkingLot: ParkingLot;
}

export interface BookingsResponse {
  success: boolean;
  data: Booking[];
}

export interface BookingResponse {
  success: boolean;
  data: Booking;
}
