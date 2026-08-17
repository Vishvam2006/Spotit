import { prisma } from '../../config/prisma';
import { ComplaintStatus } from '@prisma/client';
import type { ComplaintListQuery, BookingListQuery } from './admin.validation';

export class AdminError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AdminError';
    this.statusCode = statusCode;
  }
}

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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const complaintInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  parkingLot: { select: { id: true, name: true, address: true, city: true } },
  booking: { select: { id: true, status: true, reservedAt: true } },
} as const;

export async function getDashboard(): Promise<AdminDashboard> {
  const [totalUsers, totalOwners, totalParkings, totalBookings, activeReservations, currentlyCheckedIn, currentlyCheckedOut, pendingComplaints] =
    await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'OWNER' } }),
      prisma.parkingLot.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'RESERVED' } }),
      prisma.booking.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
    ]);

  return {
    totalUsers,
    totalOwners,
    totalParkings,
    totalBookings,
    activeReservations,
    currentlyCheckedIn,
    currentlyCheckedOut,
    pendingComplaints,
  };
}

export async function getComplaints(
  query: ComplaintListQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit, status } = query;

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: complaintInclude,
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getComplaintById(id: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: complaintInclude,
  });

  if (!complaint) {
    throw new AdminError(404, 'Complaint not found');
  }

  return complaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
) {
  const existing = await prisma.complaint.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AdminError(404, 'Complaint not found');
  }

  const complaint = await prisma.complaint.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
    },
    include: complaintInclude,
  });

  return complaint;
}

function buildBookingWhere(query: BookingListQuery) {
  const { status, parkingId, date, search } = query;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (parkingId) where.parkingLotId = parkingId;

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 86_400_000);
    where.createdAt = { gte: start, lt: end };
  }

  if (search) {
    where.OR = [
      { vehicleNumber: { contains: search, mode: 'insensitive' } },
      { id: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { parkingLot: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

const bookingInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  parkingLot: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
  },
} as const;

export async function getBookings(
  query: BookingListQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit } = query;
  const where = buildBookingWhere(query);

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getBookingById(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });

  if (!booking) {
    throw new AdminError(404, 'Booking not found');
  }

  return booking;
}