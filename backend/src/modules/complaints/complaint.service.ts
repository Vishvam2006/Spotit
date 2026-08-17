import { prisma } from '../../config/prisma';
import type {
  CreateComplaintInput,
  MyComplaintsQuery,
} from './complaint.validation';
import type { PaginatedResult } from '../admin/admin.service';

export class ComplaintError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ComplaintError';
    this.statusCode = statusCode;
  }
}

const complaintInclude = {
  user: { select: { id: true, fullName: true, email: true } },
  parkingLot: { select: { id: true, name: true, address: true, city: true } },
  booking: { select: { id: true, status: true, reservedAt: true } },
} as const;

export async function createComplaint(
  userId: string,
  input: CreateComplaintInput,
) {
  let parkingLotId = input.parkingLotId;
  let bookingId = input.bookingId;

  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: { id: true, parkingLotId: true },
    });

    if (!booking) {
      throw new ComplaintError(404, 'Booking not found');
    }

    parkingLotId = booking.parkingLotId;
  } else if (parkingLotId) {
    const parkingLot = await prisma.parkingLot.findUnique({
      where: { id: parkingLotId },
      select: { id: true },
    });

    if (!parkingLot) {
      throw new ComplaintError(404, 'Parking lot not found');
    }
  }

  return prisma.complaint.create({
    data: {
      userId,
      parkingLotId: parkingLotId ?? null,
      bookingId: bookingId ?? null,
      category: input.category,
      subject: input.subject,
      description: input.description,
    },
    include: complaintInclude,
  });
}

export async function getMyComplaints(
  userId: string,
  query: MyComplaintsQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit } = query;

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: complaintInclude,
    }),
    prisma.complaint.count({ where: { userId } }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getMyComplaintById(userId: string, id: string) {
  const complaint = await prisma.complaint.findFirst({
    where: { id, userId },
    include: complaintInclude,
  });

  if (!complaint) {
    throw new ComplaintError(404, 'Complaint not found');
  }

  return complaint;
}