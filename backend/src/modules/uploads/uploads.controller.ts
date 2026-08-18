import type { NextFunction, Request, Response } from 'express';
import {
  createEvidenceUploadSignature,
  createParkingUploadSignature,
  createVehicleUploadSignature,
  isCloudinaryConfigured,
} from '../../config/cloudinaryHelpers';
import { VehicleError } from '../vehicle/vehicle.service';

export async function getVehicleUploadSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      throw new VehicleError(
        503,
        'Vehicle image uploads are unavailable because Cloudinary is not configured. Please try again later.',
      );
    }

    const signature = createVehicleUploadSignature(req.user!.id);
    res.json({ success: true, data: signature });
  } catch (error) {
    next(error);
  }
}

export async function getParkingUploadSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      throw new VehicleError(
        503,
        'Parking photo uploads are unavailable because Cloudinary is not configured. Please try again later.',
      );
    }

    const signature = createParkingUploadSignature(req.user!.id);
    res.json({ success: true, data: signature });
  } catch (error) {
    next(error);
  }
}

export async function getEvidenceUploadSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isCloudinaryConfigured()) {
      throw new VehicleError(
        503,
        'Photo evidence uploads are unavailable because Cloudinary is not configured. You can still submit the report without a photo.',
      );
    }

    const signature = createEvidenceUploadSignature(req.user!.id);
    res.json({ success: true, data: signature });
  } catch (error) {
    next(error);
  }
}
