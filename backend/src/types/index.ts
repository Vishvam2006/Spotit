import type { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phone: string | null;
  profileImage: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      file?: {
        path: string;
        originalname: string;
        mimetype: string;
      };
    }
  }
}
