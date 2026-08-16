import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { prisma } from '../../config/prisma';
import { processDocumentVerification } from './verification.service';

export async function verifyHandler(
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

    const { files, vehicleId, expectedRegistration, expectedName } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ success: false, message: 'At least one document image must be provided.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const result = await processDocumentVerification({
      userId,
      files,
      vehicleId,
      expectedRegistration,
      expectedName: expectedName || user?.fullName,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Data = fileBuffer.toString('base64');

    const result = await processDocumentVerification({
      userId,
      files: [
        {
          name: req.file.originalname,
          data: `data:${req.file.mimetype};base64,${base64Data}`,
        },
      ],
      expectedName: user?.fullName,
    });

    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn('Failed to remove temp upload file:', err);
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
