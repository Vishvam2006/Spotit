import type { ParkingLot } from './parking';

export type BookingStatus = 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Booking {
  id: string;
  userId: string;
  parkingLotId: string;
  vehicleNumber: string;
  durationMinutes: number;
  reservedAt: string;
  checkInDeadline: string;
  checkInTime: string | null;
  sessionEndsAt: string | null;
  checkOutTime: string | null;
  estimatedAmount: number;
  finalAmount: number | null;
  status: BookingStatus;
  lastLocationAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  parkingLot: ParkingLot;
}
