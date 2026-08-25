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

const DEFAULT_BCRYPT_ROUNDS = 10;

/**
 * Password hashing cost, lowered only so the test suite is not spending ~90%
 * of its runtime on deliberate key stretching (two bcrypt ops per test user
 * adds up fast across the suite).
 *
 * Clamped to the default in production regardless of what the environment
 * says: the cost factor is the whole point of bcrypt, and a stray env var
 * must never be able to weaken real users' passwords.
 */
function resolveBcryptRounds(): number {
  const configured = Number(process.env.BCRYPT_ROUNDS);

  if (
    process.env.NODE_ENV === 'production' ||
    !Number.isInteger(configured) ||
    configured < 4 ||
    configured > 15
  ) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  return configured;
}

const BCRYPT_ROUNDS = resolveBcryptRounds();

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

const otpStore = new Map<string, { otp: string, expiresAt: number }>();

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export async function sendPasswordResetOtp(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthError(404, 'User not found');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expiresAt: Date.now() + 15 * 60 * 1000 }); // 15 mins
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not provided. Falling back to console logging.');
    console.log(`\n\n=== OTP for ${email} is ${otp} ===\n\n`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Spotit Support" <noreply@spotit.example>',
      to: email,
      subject: 'Password Reset OTP - Spotit',
      text: `Your OTP for resetting your password is: ${otp}\nThis OTP is valid for 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password. Use the following OTP to complete the process:</p>
          <h1 style="color: #071F1C; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new AuthError(500, 'Failed to send OTP email');
  }
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  const record = otpStore.get(email);
  if (!record) {
    throw new AuthError(400, 'Invalid or expired OTP');
  }
  if (record.otp !== otp) {
    throw new AuthError(400, 'Invalid OTP');
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    throw new AuthError(400, 'OTP has expired');
  }
}

export async function resetPasswordWithOtp(data: import('../validators/auth.validator').ResetPasswordInput): Promise<SafeUser> {
  await verifyPasswordResetOtp(data.email, data.otp);

  const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);

  const user = await prisma.user.update({
    where: { email: data.email },
    data: { passwordHash },
    select: safeUserSelect,
  });

  otpStore.delete(data.email);

  return user;
}
