import type { AvailabilityConfidence } from './continuity';

export type ParkingDisplayStatus =
  | 'OPERATING'
  | 'FULL'
  | 'CLOSED'
  | 'UNDER_REVIEW';
export type SlotStatus = 'OCCUPIED' | 'AVAILABLE' | 'RESERVED';
export type OwnerBookingStatus =
  | 'RESERVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface OwnerDashboard {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  completedBookings: number;
  activeBookings: number;
  reservedBookings: number;
  occupiedSlots: number;
  availableSlots: number;
  totalSlots: number;
  occupancyPercentage: number;
}

export interface OwnerParkingCard {
  id: string;
  name: string;
  location: string;
  city: string;
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  availableSlots: number;
  status: ParkingDisplayStatus;
  availabilityConfidence: AvailabilityConfidence;
  revenueGenerated: number;
}

export interface ParkingSlot {
  slot: string;
  status: SlotStatus;
}

export interface OwnerParkingStatus {
  id: string;
  name: string;
  location: string;
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  availableSlots: number;
  occupancyPercentage: number;
  status: ParkingDisplayStatus;
  slots: ParkingSlot[];
}

export interface OwnerBookingRow {
  id: string;
  vehicleNumber: string;
  customerName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  amount: number | null;
  paymentStatus: string;
  status: OwnerBookingStatus;
}

export interface RevenueParkingRow {
  id: string;
  name: string;
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

export interface OwnerRevenue {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  byParking: RevenueParkingRow[];
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface OwnerAnalytics {
  dailyRevenue: AnalyticsPoint[];
  monthlyRevenue: AnalyticsPoint[];
  occupancyTrend: AnalyticsPoint[];
}

export interface OwnerDashboardData {
  dashboard: OwnerDashboard | null;
  parkings: OwnerParkingCard[];
  revenue: OwnerRevenue | null;
  bookings: OwnerBookingRow[];
  analytics: OwnerAnalytics | null;
}