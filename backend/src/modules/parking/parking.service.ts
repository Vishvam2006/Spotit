import { prisma } from "../../config/prisma";
import type {
  CreateParkingInput,
  UpdateParkingInput,
} from "./parking.validation";

export class ParkingError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ParkingError";
    this.statusCode = statusCode;
  }
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

export async function getActiveParking() {
  return prisma.parkingLot.findMany({
    where: {
      status: "ACTIVE",
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

  const merged = {
    ...parking,
    ...data,
  };

  if (merged.availableSpaces > merged.totalSpaces) {
    throw new ParkingError(400, "Available spaces cannot exceed total spaces");
  }

  return prisma.parkingLot.update({
    where: { id },
    data,
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

  return prisma.parkingLot.delete({
    where: { id },
  });
}
