import type { NextFunction, Request, Response } from 'express';
import * as vehicleService from './vehicle.service';
import { createVehicleSchema, updateVehicleSchema } from './vehicle.validation';

export async function getVehicles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vehicles = await vehicleService.listVehicles(req.user!.id);
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
}

export async function createVehicle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createVehicleSchema.parse(req.body);
    const vehicle = await vehicleService.createVehicle(req.user!.id, data);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = updateVehicleSchema.parse(req.body);
    const vehicle = await vehicleService.updateVehicle(
      req.user!.id,
      String(req.params.id),
      data,
    );
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await vehicleService.deleteVehicle(req.user!.id, String(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function setDefaultVehicle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vehicles = await vehicleService.setDefaultVehicle(
      req.user!.id,
      String(req.params.id),
    );
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
}
