import { Prisma, type ParkingLot } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { recordEvent } from "../continuity/continuity.events";
import { releaseCapacity, refreshLotReliability } from "../continuity/continuity.service";
import * as paymentService from "../payment/payment.service";
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
    folder: process.env.CLOUDINARY_PARKING_FOLDER ?? "spotit/parking-lots",
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

  return prisma.$transaction(async (tx) => {
    const parkingLot = await tx.parkingLot.create({
      data: {
        ...rest,
        photos,
        imageUrl: imageUrl || _imageUrl,
        ownerId,
      },
    });

    // Listing a lot is what makes someone an owner in this app, but nothing
    // else ever promotes a plain USER to OWNER. Without this, anyone who
    // registers normally and adds a parking lot is permanently locked out of
    // the owner dashboard (gated to OWNER/ADMIN) even though "My Parkings"
    // still works for them.
    const owner = await tx.user.findUniqueOrThrow({ where: { id: ownerId } });
    let promotedOwner: { id: string; role: "OWNER" } | undefined;
    if (owner.role === "USER") {
      await tx.user.update({
        where: { id: ownerId },
        data: { role: "OWNER" },
      });
      promotedOwner = { id: ownerId, role: "OWNER" };
    }

    return { parkingLot, promotedOwner };
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

  // A lot the Continuity Engine pulled from circulation must not be put back
  // by the owner who caused the reports. Only an admin clears a review, and
  // even then it happens by resolving the reports, which recomputes the lot.
  // UNDER_REVIEW is not an accepted input status, so any `data.status` here is
  // an attempt to move the lot out of review.
  if (parking.status === "UNDER_REVIEW" && data.status !== undefined && !isAdmin) {
    throw new ParkingError(
      409,
      "This parking lot is under review. An admin must resolve the open reports before its status can change.",
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

    // "Owner updates lot availability" is a Continuity Engine event: it is the
    // owner's chance to correct the data a user was about to rely on, so it
    // belongs in the same audit trail as the reports that contradict it.
    if (
      updateData.availableSpaces !== undefined ||
      updateData.totalSpaces !== undefined ||
      updateData.status !== undefined
    ) {
      await recordEvent(prisma, {
        type: "LOT_CONFIDENCE_CHANGED",
        parkingLotId: id,
        actorId: ownerId,
        actorRole: isAdmin ? "ADMIN" : "OWNER",
        fromStatus: parking.status,
        toStatus: updatedParking.status,
        reason: "Owner updated the lot listing.",
        metadata: {
          availableSpaces: updatedParking.availableSpaces,
          totalSpaces: updatedParking.totalSpaces,
        },
      });
    }

    // A status change is exactly the kind of edit that can put a lot back in
    // front of users (e.g. INACTIVE -> ACTIVE). Recompute reliability so a
    // lot that still has 2+ open serious reports re-escalates to
    // UNDER_REVIEW immediately instead of quietly reappearing in search with
    // a stale confidence value. Idempotent and a no-op when nothing about
    // the open-report count has changed.
    if (updateData.status !== undefined) {
      await refreshLotReliability(id, {
        actorId: ownerId,
        actorRole: isAdmin ? 'ADMIN' : 'OWNER',
        reason: 'Owner updated the lot listing.',
      });
      const refreshed = await prisma.parkingLot.findUniqueOrThrow({ where: { id } });
      return { parking: refreshed, cancelledBookings: 0 };
    }

    return { parking: updatedParking, cancelledBookings: 0 };
  }

  const deactivated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ParkingLot" WHERE id = ${id} FOR UPDATE`;

    const updated = await tx.parkingLot.updateMany({
      where: { id, status: "ACTIVE" },
      data: updateData,
    });

    if (updated.count !== 1) {
      // A concurrent deactivation already flipped the lot to INACTIVE.
      // Idempotent: do not cancel bookings again or touch counters again.
      const current = await tx.parkingLot.findUniqueOrThrow({ where: { id } });
      return { parking: current, cancelledBookingIds: [] as string[] };
    }

    const cancelledBookingIds = await cancelUpcomingBookingsForDeactivation(tx, id);

    await recordEvent(tx, {
      type: "LOT_DEACTIVATED",
      parkingLotId: id,
      actorId: ownerId,
      actorRole: isAdmin ? "ADMIN" : "OWNER",
      fromStatus: parking.status,
      toStatus: "INACTIVE",
      reason: "Lot deactivated by its owner.",
      metadata: { cancelledBookings: cancelledBookingIds.length },
    });

    const current = await tx.parkingLot.findUniqueOrThrow({ where: { id } });
    return { parking: current, cancelledBookingIds };
  });

  // Refund every driver whose reservation was just cancelled out from under
  // them. This runs after the transaction above has committed: the Razorpay
  // call is slow and external, and must never hold the row lock or risk
  // rolling back a deactivation that has already taken effect.
  if (deactivated.cancelledBookingIds.length > 0) {
    await paymentService.refundBookingPayments(
      deactivated.cancelledBookingIds,
      "PARKING_DEACTIVATED",
    );
  }

  return {
    parking: deactivated.parking,
    cancelledBookings: deactivated.cancelledBookingIds.length,
  };
}

async function cancelUpcomingBookingsForDeactivation(
  tx: Prisma.TransactionClient,
  parkingId: string,
): Promise<string[]> {
  const now = new Date();

  const affected = await tx.booking.findMany({
    where: {
      parkingLotId: parkingId,
      status: "RESERVED",
      checkInDeadline: { gt: now },
    },
    select: { id: true },
  });

  const cancelledIds: string[] = [];
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

    cancelledIds.push(booking.id);
    await releaseCapacity(tx, parkingId);
  }

  return cancelledIds;
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
