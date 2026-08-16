import { Prisma, type ParkingLot } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { cloudinary } from "../../config/cloudinary";
import { isCloudinaryConfigured } from "../../config/cloudinaryHelpers";

import { haversineDistanceKm } from "../../utils/distance";
import type {
  CreateParkingInput,
  UpdateParkingInput,
  ParkingListQuery,

} from "./parking.validation";

export class ParkingError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ParkingError";
    this.statusCode = statusCode;
  }
}

export type ParkingLotWithDistance = Prisma.ParkingLotGetPayload<{}> & {
  distanceKm?: number;
};

const orderByMap: Record<
  Exclude<ParkingListQuery["sort"], "nearest" | undefined>,
  Prisma.ParkingLotOrderByWithRelationInput
> = {
  newest: { createdAt: "desc" },
  cheapest: { pricePerHour: "asc" },
  expensive: { pricePerHour: "desc" },
};

function buildWhere(filters: ParkingListQuery): Prisma.ParkingLotWhereInput {
  const where: Prisma.ParkingLotWhereInput = {
    status: "ACTIVE",
  };

  const searchTerm = filters.q?.trim();
  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { address: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (filters.city) {
    where.city = filters.city;
  }

  if (filters.maxPrice !== undefined) {
    where.pricePerHour = { lte: filters.maxPrice };
  }

  if (filters.availableOnly) {
    where.availableSpaces = { gt: 0 };
  }

  return where;
}

function sortByDistance(
  parkingLots: ParkingLotWithDistance[],
  lat: number,
  lng: number,
): ParkingLotWithDistance[] {
  return parkingLots
    .map((parking) => ({
      ...parking,
      distanceKm: haversineDistanceKm(lat, lng, parking.latitude, parking.longitude),
    }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export async function getActiveParking(
  filters: ParkingListQuery = {},
): Promise<ParkingLotWithDistance[]> {
  const where = buildWhere(filters);

  if (filters.sort === "nearest") {
    const lots = await prisma.parkingLot.findMany({ where });
    return sortByDistance(lots, filters.lat!, filters.lng!);
  }

  const orderBy = orderByMap[filters.sort ?? "newest"];

  return prisma.parkingLot.findMany({
    where,
    orderBy,
  });
}

export async function getMyParkings(ownerId: string) {
  return prisma.parkingLot.findMany({
    where: {
      ownerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getParkingById(id: string) {
  return prisma.parkingLot.findUnique({
    where: { id },
  });
}

function isDataUri(value: string) {
  return value.startsWith("data:image/");
}

async function uploadPhoto(value: string): Promise<string> {
  if (!isDataUri(value)) {
    return value;
  }

  if (!isCloudinaryConfigured()) {
    return value;
  }

  const result = await cloudinary.uploader.upload(value, {
    folder: process.env.CLOUDINARY_PARKING_FOLDER ?? "parkmitra/parking-lots",
    resource_type: "image",
  });

  return result.secure_url;
}

async function resolvePhotos(photos?: string[]): Promise<{ photos: string[]; imageUrl: string }> {
  if (!photos || photos.length === 0) {
    return { photos: [], imageUrl: "" };
  }

  const resolved = await Promise.all(photos.map(uploadPhoto));

  return {
    photos: resolved,
    imageUrl: resolved[0],
  };
}

export async function createParking(ownerId: string, data: CreateParkingInput) {
  const { photos, imageUrl } = await resolvePhotos(data.photos);
  const { photos: _photos, imageUrl: _imageUrl, ...rest } = data;

  return prisma.parkingLot.create({
    data: {
      ...rest,
      photos,
      imageUrl: imageUrl || _imageUrl,
      ownerId,
    },
  });
}

export async function updateParking(
  id: string,
  ownerId: string,
  data: UpdateParkingInput,
  isAdmin = false
): Promise<{ parking: ParkingLot; cancelledBookings: number }> {
  const parking = await prisma.parkingLot.findUnique({
    where: { id },
  });

  if (!parking) {
    throw new ParkingError(404, "Parking lot not found");
  }

  if (!isAdmin && parking.ownerId !== ownerId) {
    throw new ParkingError(403, "Unauthorized");
  }

  const occupiedSpaces = parking.totalSpaces - parking.availableSpaces;

  const merged = {
    ...parking,
    ...data,
  };

  if (merged.availableSpaces > merged.totalSpaces) {
    throw new ParkingError(400, "Available spaces cannot exceed total spaces");
  }

  if (merged.totalSpaces < occupiedSpaces) {
    throw new ParkingError(
      400,
      "Total spaces cannot be less than currently occupied spaces",
    );
  }

  let updateData: UpdateParkingInput = data;
  if (data.totalSpaces !== undefined && data.availableSpaces === undefined) {
    updateData = { ...data, availableSpaces: merged.totalSpaces - occupiedSpaces };
  }

  if (updateData.photos !== undefined) {
    const resolved = await resolvePhotos(updateData.photos);
    updateData = { ...updateData, photos: resolved.photos, imageUrl: resolved.imageUrl };
  }

  const deactivating = updateData.status === "INACTIVE" && parking.status === "ACTIVE";

  if (!deactivating) {
    const updatedParking = await prisma.parkingLot.update({
      where: { id },
      data: updateData,
    });

    return { parking: updatedParking, cancelledBookings: 0 };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.parkingLot.updateMany({
      where: { id, status: "ACTIVE" },
      data: updateData,
    });

    if (updated.count !== 1) {
      // A concurrent deactivation already flipped the lot to INACTIVE.
      // Idempotent: do not cancel bookings again or touch counters again.
      const current = await tx.parkingLot.findUniqueOrThrow({ where: { id } });
      return { parking: current, cancelledBookings: 0 };
    }

    const cancelledBookings = await cancelUpcomingBookingsForDeactivation(tx, id);

    const current = await tx.parkingLot.findUniqueOrThrow({ where: { id } });
    return { parking: current, cancelledBookings };
  });
}

async function cancelUpcomingBookingsForDeactivation(
  tx: Prisma.TransactionClient,
  parkingId: string,
): Promise<number> {
  const now = new Date();

  const affected = await tx.booking.findMany({
    where: {
      parkingLotId: parkingId,
      status: "RESERVED",
      checkInDeadline: { gt: now },
    },
    select: { id: true },
  });

  let cancelled = 0;
  for (const booking of affected) {
    const result = await tx.booking.updateMany({
      where: { id: booking.id, status: "RESERVED" },
      data: {
        status: "CANCELLED",
        cancellationReason: "PARKING_DEACTIVATED",
        cancelledAt: now,
      },
    });

    if (result.count !== 1) continue;

    cancelled += 1;
    await tx.parkingLot.update({
      where: { id: parkingId },
      data: { availableSpaces: { increment: 1 } },
    });
  }

  return cancelled;
}

export async function deleteParking(
  id: string,
  ownerId: string,
  isAdmin = false
) {
  const parking = await prisma.parkingLot.findUnique({
    where: { id },
  });

  if (!parking) {
    throw new ParkingError(404, "Parking lot not found");
  }

  if (!isAdmin && parking.ownerId !== ownerId) {
    throw new ParkingError(403, "Unauthorized");
  }

  const activeBooking = await prisma.booking.findFirst({
    where: {
      parkingLotId: id,
      status: { in: ["RESERVED", "ACTIVE"] },
    },
    select: { id: true },
  });

  if (activeBooking) {
    throw new ParkingError(
      409,
      "Cannot delete a parking lot with active or reserved bookings",
    );
  }

  return prisma.parkingLot.delete({
    where: { id },
  });
}
