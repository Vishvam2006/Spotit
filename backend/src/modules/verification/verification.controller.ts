import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { VerificationService, type AccountDataPayload } from './verification.service';

export async function verifyDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload a document file (JPG, PNG, or PDF)' });
      return;
    }

    // Retrieve authoritative user account data from Database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    // Retrieve user's vehicles for RC comparison
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      select: { registration: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    const primaryVehicleReg = vehicles.length > 0 ? vehicles[0].registration : undefined;
    const dobFromReq = typeof req.body?.date_of_birth === 'string' ? req.body.date_of_birth.trim() : undefined;

    const accountPayload: AccountDataPayload = {
      name: user.fullName,
      date_of_birth: dobFromReq || null,
      vehicle_registration_number: primaryVehicleReg || null,
    };

    // Process document via isolated AI verification engine
    const verificationResult = await VerificationService.verifyDocument(
      req.file.path,
      req.file.originalname,
      accountPayload,
    );

    res.json({
      success: true,
      data: verificationResult,
    });
  } catch (error) {
    next(error);
  }
}
