import type { Request, Response } from "express";
import * as parkingService from "./parking.service";
import { ParkingError } from "./parking.service";

import {
  createParkingSchema,
  updateParkingSchema,
  parkingListQuerySchema,
} from "./parking.validation";

export async function getMyParkings(req: Request, res: Response) {
  const ownerId = req.user!.id;

  const parkings = await parkingService.getMyParkings(ownerId);

  return res.json({
    success: true,
    data: parkings,
  });
}


export async function getParkingLots(req: Request, res: Response) {
  const result = parkingListQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: result.error.issues.map((issue) => issue.message),
    });
  }

  const parkingLots = await parkingService.getActiveParking(result.data);

  res.json({
    success: true,
    data: parkingLots,
  });
}

export async function getParkingLot(req: Request, res: Response) {
  const id = String(req.params.id);
  const parkingLot = await parkingService.getParkingById(id);

  if (!parkingLot) {
    return res.status(404).json({
      success: false,
      message: "Parking lot not found",
    });
  }

  res.json({
    success: true,
    data: parkingLot,
  });
}

export async function createParkingLot(req: Request, res: Response) {
  const result = createParkingSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.flatten(),
    });
  }

  const ownerId = req.user!.id;

  const parkingLot = await parkingService.createParking(ownerId, result.data);

  res.status(201).json({
    success: true,
    data: parkingLot,
  });
}

export async function updateParkingLot(req: Request, res: Response) {
  const result = updateParkingSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.flatten(),
    });
  }

  const ownerId = req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";
  const id = String(req.params.id);

  try {
    const updated = await parkingService.updateParking(
      id,
      ownerId,
      result.data,
      isAdmin
    );

    res.json({
      success: true,
      data: updated.parking,
      ...(updated.cancelledBookings > 0
        ? { cancelledBookings: updated.cancelledBookings }
        : {}),
    });
  } catch (error) {
    if (error instanceof ParkingError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function deleteParkingLot(req: Request, res: Response) {
  const ownerId = req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";
  const id = String(req.params.id);

  try {
    await parkingService.deleteParking(id, ownerId, isAdmin);

    res.status(204).send();
  } catch (error) {
    if (error instanceof ParkingError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
