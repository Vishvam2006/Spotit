import { Prisma, type Vehicle } from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  deleteCloudinaryAsset,
  isCloudinaryConfigured,
  verifyVehicleImage,
} from '../../config/cloudinaryHelpers';
import type { CreateVehicleInput, UpdateVehicleInput } from './vehicle.validation';

export class VehicleError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'VehicleError';
    this.statusCode = statusCode;
  }
}

function normalizeRegistration(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

async function assertImageVerified(userId: string, imagePublicId: string, imageUrl: string) {
  try {
    await verifyVehicleImage(userId, imagePublicId, imageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid vehicle image';
    throw new VehicleError(400, message);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

function uniqueViolationMessage(error: unknown): string {
  const target = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : null;
  if (Array.isArray(target) && target.includes('registration')) {
    return 'A vehicle with this registration number already exists.';
  }
  return 'A vehicle with the same details already exists.';
}

export async function listVehicles(userId: string): Promise<Vehicle[]> {
  return prisma.vehicle.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

async function findOwnedVehicle(userId: string, vehicleId: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
  });

  if (!vehicle) {
    throw new VehicleError(404, 'Vehicle not found');
  }

  return vehicle;
}

export async function createVehicle(
  userId: string,
  input: CreateVehicleInput,
): Promise<Vehicle> {
  if (!isCloudinaryConfigured()) {
    throw new VehicleError(
      503,
      'Vehicle image uploads are unavailable because Cloudinary is not configured. Please try again later.',
    );
  }

  await assertImageVerified(userId, input.imagePublicId, input.imageUrl);

  const registration = normalizeRegistration(input.registration);

  try {
    return await prisma.$transaction(async (tx) => {
      const vehicleCount = await tx.vehicle.count({ where: { userId } });
      const makeDefault = input.isDefault === true || vehicleCount === 0;

      if (makeDefault) {
        await tx.vehicle.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.vehicle.create({
        data: {
          userId,
          registration,
          type: input.type,
          imageUrl: input.imageUrl,
          imagePublicId: input.imagePublicId,
          make: input.make ?? null,
          model: input.model ?? null,
          color: input.color ?? null,
          isDefault: makeDefault,
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new VehicleError(409, uniqueViolationMessage(error));
    }
    throw error;
  }
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<Vehicle> {
  const vehicle = await findOwnedVehicle(userId, vehicleId);

  let registration = vehicle.registration;
  if (input.registration !== undefined) {
    registration = normalizeRegistration(input.registration);
  }

  if (registration !== vehicle.registration) {
    const duplicate = await prisma.vehicle.findFirst({
      where: { userId, registration, id: { not: vehicleId } },
      select: { id: true },
    });
    if (duplicate) {
      throw new VehicleError(409, 'A vehicle with this registration number already exists.');
    }
  }

  // A verification result is only meaningful for the plate it was run against,
  // so changing the registration invalidates it.
  const registrationChanged = registration !== vehicle.registration;

  let imageUrl = vehicle.imageUrl;
  let imagePublicId = vehicle.imagePublicId;
  let imageReplaced = false;

  if (input.imageUrl !== undefined && input.imagePublicId !== undefined) {
    await assertImageVerified(userId, input.imagePublicId, input.imageUrl);
    imageUrl = input.imageUrl;
    imagePublicId = input.imagePublicId;
    imageReplaced = imagePublicId !== vehicle.imagePublicId;
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.vehicle.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          registration,
          type: input.type ?? vehicle.type,
          imageUrl,
          imagePublicId,
          make: input.make !== undefined ? input.make : vehicle.make,
          model: input.model !== undefined ? input.model : vehicle.model,
          color: input.color !== undefined ? input.color : vehicle.color,
          isDefault: input.isDefault ?? vehicle.isDefault,
          ...(registrationChanged
            ? { verificationStatus: null, verifiedAt: null }
            : {}),
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new VehicleError(409, uniqueViolationMessage(error));
    }
    throw error;
  }

  if (imageReplaced) {
    const referenced = await prisma.booking.count({ where: { vehicleId: vehicle.id } });
    if (referenced === 0) {
      await deleteCloudinaryAsset(vehicle.imagePublicId);
    }
  }

  const updated = await prisma.vehicle.findUnique({
    where: { id: vehicle.id },
  });

  if (!updated) {
    throw new VehicleError(404, 'Vehicle not found');
  }

  return updated;
}

export async function deleteVehicle(userId: string, vehicleId: string): Promise<void> {
  const vehicle = await findOwnedVehicle(userId, vehicleId);

  const activeReserved = await prisma.booking.count({
    where: { vehicleId: vehicle.id, status: { in: ['ACTIVE', 'RESERVED'] } },
  });

  if (activeReserved > 0) {
    throw new VehicleError(
      409,
      'This vehicle is used by an active or reserved booking and cannot be deleted.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.delete({ where: { id: vehicle.id } });

    if (vehicle.isDefault) {
      const nextDefault = await tx.vehicle.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (nextDefault) {
        await tx.vehicle.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  });

  const referenced = await prisma.booking.count({ where: { vehicleId: vehicle.id } });
  if (referenced === 0) {
    await deleteCloudinaryAsset(vehicle.imagePublicId);
  }
}

export async function setDefaultVehicle(
  userId: string,
  vehicleId: string,
): Promise<Vehicle[]> {
  const vehicle = await findOwnedVehicle(userId, vehicleId);

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { isDefault: true },
    });
  });

  return listVehicles(userId);
}
