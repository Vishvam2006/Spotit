export type BookingStatus =
  | 'RESERVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AdminDashboard {
  totalUsers: number;
  totalOwners: number;
  totalParkings: number;
  totalBookings: number;
  activeReservations: number;
  currentlyCheckedIn: number;
  currentlyCheckedOut: number;
  pendingComplaints: number;
}

export interface AdminBookingUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface AdminBookingOwner {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminBookingParking {
  id: string;
  name: string;
  address: string;
  city: string;
  owner?: AdminBookingOwner;
}

export interface AdminBooking {
  id: string;
  vehicleNumber: string;
  vehicleRegistration: string;
  vehicleType: 'TWO_WHEELER' | 'FOUR_WHEELER';
  durationMinutes: number;
  reservedAt: string;
  checkInDeadline: string;
  checkInTime: string | null;
  sessionEndsAt: string | null;
  checkOutTime: string | null;
  status: BookingStatus;
  estimatedAmount: number | null;
  finalAmount: number | null;
  createdAt: string;
  user: AdminBookingUser;
  parkingLot: AdminBookingParking;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}