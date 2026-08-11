import type { ParkingLot } from './parking';
import type { VehicleType } from './vehicle';

export type BookingStatus = 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

/**
 * Snapshot of the vehicle at the time the booking was created. Old bookings
 * (created before the vehicle library existed) have `id: null` and an empty
 * `imageUrl`, so the UI must render a placeholder for that legacy state.
 */
export interface BookingVehicle {
  id: string | null;
  registration: string;
  type: VehicleType;
  imageUrl: string;
  make: string | null;
  model: string | null;
  color: string | null;
}

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
  vehicle: BookingVehicle;
}
