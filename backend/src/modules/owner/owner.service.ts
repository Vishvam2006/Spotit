import { prisma } from '../../config/prisma';
import type { AvailabilityConfidence, Booking, ParkingLot } from '@prisma/client';

export class OwnerError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'OwnerError';
    this.statusCode = statusCode;
  }
}

export type ParkingDisplayStatus =
  | 'OPERATING'
  | 'FULL'
  | 'CLOSED'
  | 'UNDER_REVIEW';
export type SlotStatus = 'OCCUPIED' | 'AVAILABLE' | 'RESERVED';

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

export interface ParkingStatusCard {
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

export interface SlotInfo {
  slot: string;
  status: SlotStatus;
}

export interface ParkingStatusDetail {
  id: string;
  name: string;
  location: string;
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  availableSlots: number;
  occupancyPercentage: number;
  status: ParkingDisplayStatus;
  slots: SlotInfo[];
}

export interface OwnerBookingRow {
  id: string;
  vehicleNumber: string;
  customerName: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  amount: number | null;
  paymentStatus: string;
  status: string;
}

export interface RevenueParkingRow {
  id: string;
  name: string;
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

export interface OwnerRevenueSummary {
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

interface BookingSnapshot {
  id: string;
  parkingLotId: string;
  status: string;
  estimatedAmount: number | null;
  finalAmount: number | null;
  reservedAt: Date;
  checkInDeadline: Date;
  checkInTime: Date | null;
  sessionEndsAt: Date | null;
  checkOutTime: Date | null;
  createdAt: Date;
}

interface LotWithCapacity {
  id: string;
  name: string;
  city: string;
  address: string;
  totalSpaces: number;
  status: string;
  availabilityConfidence: AvailabilityConfidence;
}

function startOfDayUtc(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
}

function startOfMonthUtc(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
}

function addDaysUtc(day: Date, days: number): Date {
  return new Date(day.getTime() + days * 86_400_000);
}

function addMonthsUtc(month: Date, months: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + months, 1));
}

function revenueForBooking(booking: Pick<BookingSnapshot, 'status' | 'estimatedAmount' | 'finalAmount'>): number {
  if (booking.status === 'COMPLETED') {
    return booking.finalAmount ?? booking.estimatedAmount ?? 0;
  }
  if (booking.status === 'ACTIVE') {
    return booking.estimatedAmount ?? 0;
  }
  return 0;
}

function revenueDateOf(booking: BookingSnapshot): Date {
  return booking.status === 'COMPLETED'
    ? (booking.checkOutTime ?? booking.createdAt)
    : booking.createdAt;
}

function displayStatusFor(
  lotStatus: string,
  availableSlots: number,
): ParkingDisplayStatus {
  // A lot the Continuity Engine pulled from circulation is not operating, no
  // matter how many slots look free: it cannot take a booking in that state.
  if (lotStatus === 'UNDER_REVIEW') {
    return 'UNDER_REVIEW';
  }
  if (lotStatus === 'INACTIVE' || lotStatus === 'CLOSED') {
    return 'CLOSED';
  }
  if (availableSlots <= 0) {
    return 'FULL';
  }
  return 'OPERATING';
}

function sumRevenue(bookings: BookingSnapshot[]): number {
  return bookings.reduce((total, booking) => total + revenueForBooking(booking), 0);
}

interface ComputedSlotCounts {
  occupied: number;
  reserved: number;
  available: number;
}

function computeSlotCounts(totalSpaces: number, bookings: BookingSnapshot[]): ComputedSlotCounts {
  const now = new Date();
  let occupied = 0;
  let reserved = 0;

  for (const booking of bookings) {
    if (booking.status === 'ACTIVE') {
      occupied += 1;
    } else if (booking.status === 'RESERVED' && booking.checkInDeadline > now) {
      reserved += 1;
    }
  }

  const available = Math.max(0, totalSpaces - occupied - reserved);

  return { occupied, reserved, available };
}

async function getOwnerLotsAndBookings(ownerId: string): Promise<{
  lots: LotWithCapacity[];
  bookings: BookingSnapshot[];
}> {
  const [lots, bookings] = await Promise.all([
    prisma.parkingLot.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.findMany({
      where: { parkingLot: { ownerId } },
      select: {
        id: true,
        parkingLotId: true,
        status: true,
        estimatedAmount: true,
        finalAmount: true,
        reservedAt: true,
        checkInDeadline: true,
        checkInTime: true,
        sessionEndsAt: true,
        checkOutTime: true,
        createdAt: true,
      },
    }),
  ]);

  return { lots, bookings };
}

export async function getDashboard(ownerId: string): Promise<OwnerDashboard> {
  const { lots, bookings } = await getOwnerLotsAndBookings(ownerId);
  const now = new Date();
  const todayStart = startOfDayUtc(now);
  const monthStart = startOfMonthUtc(now);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let monthlyRevenue = 0;
  let completedBookings = 0;
  let activeBookings = 0;
  let reservedBookings = 0;
  let occupiedSlots = 0;
  let availableSlots = 0;
  let totalSlots = 0;

  const bookingsByLot = new Map<string, BookingSnapshot[]>();
  for (const lot of lots) {
    bookingsByLot.set(lot.id, []);
    totalSlots += lot.totalSpaces;
  }
  for (const booking of bookings) {
    bookingsByLot.get(booking.parkingLotId)?.push(booking);

    const revenue = revenueForBooking(booking);
    totalRevenue += revenue;

    const revenueDate = revenueDateOf(booking);
    if (revenueDate >= todayStart) {
      todayRevenue += revenue;
    }
    if (revenueDate >= monthStart) {
      monthlyRevenue += revenue;
    }

    if (booking.status === 'COMPLETED') {
      completedBookings += 1;
    } else if (booking.status === 'ACTIVE') {
      activeBookings += 1;
    } else if (booking.status === 'RESERVED' && booking.checkInDeadline > now) {
      reservedBookings += 1;
    }
  }

  for (const lot of lots) {
    const counts = computeSlotCounts(lot.totalSpaces, bookingsByLot.get(lot.id) ?? []);
    occupiedSlots += counts.occupied;
    availableSlots += counts.available;
  }

  const occupancyPercentage =
    totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  return {
    totalRevenue: Math.round(totalRevenue),
    todayRevenue: Math.round(todayRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    completedBookings,
    activeBookings,
    reservedBookings,
    occupiedSlots,
    availableSlots,
    totalSlots,
    occupancyPercentage,
  };
}

export async function getRevenue(ownerId: string): Promise<OwnerRevenueSummary> {
  const { lots, bookings } = await getOwnerLotsAndBookings(ownerId);
  const now = new Date();
  const todayStart = startOfDayUtc(now);
  const monthStart = startOfMonthUtc(now);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let monthlyRevenue = 0;

  const counts = new Map<string, { total: number; today: number; monthly: number }>();
  for (const lot of lots) counts.set(lot.id, { total: 0, today: 0, monthly: 0 });

  for (const booking of bookings) {
    const revenue = revenueForBooking(booking);
    totalRevenue += revenue;

    const revenueDate = revenueDateOf(booking);
    if (revenueDate >= todayStart) todayRevenue += revenue;
    if (revenueDate >= monthStart) monthlyRevenue += revenue;

    const bucket = counts.get(booking.parkingLotId);
    if (bucket) {
      bucket.total += revenue;
      if (revenueDate >= todayStart) bucket.today += revenue;
      if (revenueDate >= monthStart) bucket.monthly += revenue;
    }
  }

  const byParking: RevenueParkingRow[] = lots.map((lot) => {
    const bucket = counts.get(lot.id) ?? { total: 0, today: 0, monthly: 0 };
    return {
      id: lot.id,
      name: lot.name,
      totalRevenue: Math.round(bucket.total),
      todayRevenue: Math.round(bucket.today),
      monthlyRevenue: Math.round(bucket.monthly),
    };
  });

  return {
    totalRevenue: Math.round(totalRevenue),
    todayRevenue: Math.round(todayRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    byParking,
  };
}

export async function getOwnerParkings(ownerId: string): Promise<ParkingStatusCard[]> {
  const { lots, bookings } = await getOwnerLotsAndBookings(ownerId);

  const bookingsByLot = new Map<string, BookingSnapshot[]>();
  for (const lot of lots) bookingsByLot.set(lot.id, []);

  const revenueByLot = new Map<string, number>();
  for (const booking of bookings) {
    bookingsByLot.get(booking.parkingLotId)?.push(booking);
    revenueByLot.set(
      booking.parkingLotId,
      (revenueByLot.get(booking.parkingLotId) ?? 0) + revenueForBooking(booking),
    );
  }

  return lots.map((lot) => {
    const counts = computeSlotCounts(lot.totalSpaces, bookingsByLot.get(lot.id) ?? []);

    return {
      id: lot.id,
      name: lot.name,
      location: lot.address,
      city: lot.city,
      totalSlots: lot.totalSpaces,
      occupiedSlots: counts.occupied,
      reservedSlots: counts.reserved,
      availableSlots: counts.available,
      status: displayStatusFor(lot.status, counts.available),
      availabilityConfidence: lot.availabilityConfidence,
      revenueGenerated: Math.round(revenueByLot.get(lot.id) ?? 0),
    };
  });
}

async function findOwnedLot(ownerId: string, parkingId: string): Promise<ParkingLot> {
  const lot = await prisma.parkingLot.findUnique({ where: { id: parkingId } });

  if (!lot) {
    throw new OwnerError(404, 'Parking lot not found');
  }

  if (lot.ownerId !== ownerId) {
    throw new OwnerError(403, 'Unauthorized');
  }

  return lot;
}

export async function getParkingStatus(
  ownerId: string,
  parkingId: string,
): Promise<ParkingStatusDetail> {
  const lot = await findOwnedLot(ownerId, parkingId);

  const bookings = await prisma.booking.findMany({
    where: { parkingLotId: parkingId },
    select: {
      id: true,
      parkingLotId: true,
      status: true,
      estimatedAmount: true,
      finalAmount: true,
      reservedAt: true,
      checkInDeadline: true,
      checkInTime: true,
      sessionEndsAt: true,
      checkOutTime: true,
      createdAt: true,
    },
  });

  const counts = computeSlotCounts(lot.totalSpaces, bookings);

  const slots: SlotInfo[] = [];
  let index = 0;
  for (const _ of Array.from({ length: counts.occupied })) {
    slots.push({ slot: `P${index + 1}`, status: 'OCCUPIED' });
    index += 1;
  }
  for (const _ of Array.from({ length: counts.reserved })) {
    slots.push({ slot: `P${index + 1}`, status: 'RESERVED' });
    index += 1;
  }
  for (const _ of Array.from({ length: counts.available })) {
    slots.push({ slot: `P${index + 1}`, status: 'AVAILABLE' });
    index += 1;
  }

  return {
    id: lot.id,
    name: lot.name,
    location: lot.address,
    totalSlots: lot.totalSpaces,
    occupiedSlots: counts.occupied,
    reservedSlots: counts.reserved,
    availableSlots: counts.available,
    occupancyPercentage:
      lot.totalSpaces > 0 ? Math.round((counts.occupied / lot.totalSpaces) * 100) : 0,
    status: displayStatusFor(lot.status, counts.available),
    slots,
  };
}

function paymentStatusFor(status: string, hasFinalAmount: boolean): string {
  switch (status) {
    case 'COMPLETED':
      return hasFinalAmount ? 'PAID' : 'NOT_CHARGED';
    case 'ACTIVE':
      return 'PAID';
    case 'RESERVED':
      return 'PENDING';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'NOT_CHARGED';
    default:
      return 'UNKNOWN';
  }
}

export async function getOwnerBookings(
  ownerId: string,
  limit = 20,
): Promise<OwnerBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: { parkingLot: { ownerId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { fullName: true } },
    },
  });

  return bookings.map((booking) => {
    const amount =
      booking.status === 'RESERVED'
        ? booking.estimatedAmount
        : booking.finalAmount ?? booking.estimatedAmount;

    const hasFinalAmount = booking.finalAmount !== null;

    return {
      id: booking.id,
      vehicleNumber: booking.vehicleNumber,
      customerName: booking.user.fullName,
      startTime: booking.checkInTime ?? booking.reservedAt,
      endTime: booking.sessionEndsAt ?? booking.checkOutTime,
      durationMinutes: booking.durationMinutes,
      amount,
      paymentStatus: paymentStatusFor(booking.status, hasFinalAmount),
      status: booking.status,
    };
  });
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function hourlyOccupancyForSlot(
  hourStart: Date,
  hourEnd: Date,
  checkInTime: Date | null,
  sessionEndsAt: Date | null,
  checkOutTime: Date | null,
): boolean {
  if (!checkInTime || !sessionEndsAt) return false;
  const sessionEnd = checkOutTime && checkOutTime < sessionEndsAt ? checkOutTime : sessionEndsAt;
  return intervalsOverlap(checkInTime, sessionEnd, hourStart, hourEnd);
}

export async function getOwnerAnalytics(ownerId: string): Promise<OwnerAnalytics> {
  const { lots, bookings } = await getOwnerLotsAndBookings(ownerId);
  const now = new Date();
  const todayStart = startOfDayUtc(now);

  const dailyRevenue: AnalyticsPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = addDaysUtc(todayStart, -offset);
    const dayEnd = addDaysUtc(dayStart, 1);
    const revenue = bookings
      .filter((booking) => {
        const date = revenueDateOf(booking);
        return date >= dayStart && date < dayEnd;
      })
      .reduce((total, booking) => total + revenueForBooking(booking), 0);

    dailyRevenue.push({ label: dayLabel(dayStart), value: Math.round(revenue) });
  }

  const monthlyRevenue: AnalyticsPoint[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthStart = addMonthsUtc(todayStart, -offset);
    const monthEnd = addMonthsUtc(monthStart, 1);
    const revenue = bookings
      .filter((booking) => {
        const date = revenueDateOf(booking);
        return date >= monthStart && date < monthEnd;
      })
      .reduce((total, booking) => total + revenueForBooking(booking), 0);

    monthlyRevenue.push({ label: monthLabel(monthStart), value: Math.round(revenue) });
  }

  const totalCapacity = lots.reduce((sum, lot) => sum + lot.totalSpaces, 0);

  const occupancyTrend: AnalyticsPoint[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const hourStart = new Date(now.getTime());
    hourStart.setUTCHours(hour, 0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 3_600_000);

    let occupied = 0;
    for (const booking of bookings) {
      const overlapsBooking = hourlyOccupancyForSlot(
        hourStart,
        hourEnd,
        booking.checkInTime,
        booking.sessionEndsAt,
        booking.checkOutTime,
      );
      if (overlapsBooking) occupied += 1;
    }

    const averagePerLot =
      lots.length > 0 ? Math.round((occupied / lots.length) * 10) / 10 : 0;
    const percentage = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;

    occupancyTrend.push({
      label: hourLabel(hour),
      value: percentage,
    });
  }

  return { dailyRevenue, monthlyRevenue, occupancyTrend };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function dayLabel(date: Date): string {
  return DAY_LABELS[date.getUTCDay()] ?? '';
}

function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getUTCMonth()] ?? '';
}

function hourLabel(hour: number): string {
  return `${hour}`;
}