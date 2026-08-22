import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { getUserProfile, updateUserProfile } from './user.service';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const profile = await getUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters").optional(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().nullable(),
  profileImage: z.string().url("Must be a valid URL").optional().nullable(),
});

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = updateProfileSchema.parse(req.body);
    
    const updatedProfile = await updateUserProfile(userId, {
      fullName: data.fullName,
      phone: data.phone === null ? '' : data.phone,
      bio: data.bio === null ? '' : data.bio,
      profileImage: data.profileImage === null ? '' : data.profileImage,
    });

    res.json({ success: true, data: updatedProfile });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.issues });
    }
    next(error);
  }
}
