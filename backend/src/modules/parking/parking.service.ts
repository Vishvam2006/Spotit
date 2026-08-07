import { prisma } from "../../config/prisma";
import type { CreateParkingInput, UpdateParkingInput } from "./parking.validation";

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
) {
  const parking = await prisma.parkingLot.findUnique({
    where: { id },
  });

  if (!parking) {
    throw new Error("Parking lot not found");
  }

  if (parking.ownerId !== ownerId) {
    throw new Error("Unauthorized");
  }

  return prisma.parkingLot.update({
    where: { id },
    data,
  });
}

export async function deleteParking(id: string, ownerId: string) {
  const parking = await prisma.parkingLot.findUnique({
    where: { id },
  });

  if (!parking) {
    throw new Error("Parking lot not found");
  }

  if (parking.ownerId !== ownerId) {
    throw new Error("Unauthorized");
  }

  return prisma.parkingLot.delete({
    where: { id },
  });
}
