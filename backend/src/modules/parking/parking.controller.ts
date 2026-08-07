import type { Request, Response } from "express";
import * as parkingService from "./parking.service";
import {
  createParkingSchema,
  updateParkingSchema,
} from "./parking.validation";

export async function getParkingLots(_req: Request, res: Response) {
  const parkingLots = await parkingService.getActiveParking();

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

  const parkingLot = await parkingService.createParking(
    ownerId,
    result.data,
  );

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
  const id = String(req.params.id);

  try {
    const parkingLot = await parkingService.updateParking(
      id,
      ownerId,
      result.data,
    );

    res.json({
      success: true,
      data: parkingLot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(message === "Unauthorized" ? 403 : 404).json({
      success: false,
      message,
    });
  }
}

export async function deleteParkingLot(req: Request, res: Response) {
  const ownerId = req.user!.id;
  const id = String(req.params.id);

  try {
    await parkingService.deleteParking(id, ownerId);

    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(message === "Unauthorized" ? 403 : 404).json({
      success: false,
      message,
    });
  }
}
