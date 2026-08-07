import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import type { LoginInput, RegisterInput } from '../validators/auth.validator';
import type { SafeUser } from '../types';

export class AuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  phone: true,
  profileImage: true,
} as const;

const BCRYPT_ROUNDS = 10;

export async function registerUser(data: RegisterInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AuthError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash,
    },
    select: safeUserSelect,
  });

  return user;
}

export async function loginUser(data: LoginInput): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AuthError(401, 'Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthError(401, 'Invalid credentials');
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    profileImage: user.profileImage,
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) {
    throw new AuthError(404, 'User not found');
  }

  return user;
}
