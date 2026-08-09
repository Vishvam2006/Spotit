import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

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

export async function createParking(ownerId: string, data: CreateParkingInput) {
  return prisma.parkingLot.create({
    data: {
      ...data,
      ownerId,
    },
  });
}

export async function updateParking(
  id: string,
  ownerId: string,
  data: UpdateParkingInput,
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

  return prisma.parkingLot.update({
    where: { id },
    data: updateData,
  });
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
