import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be at most 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  otp: z.string().length(6, 'OTP must be 6 characters'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  otp: z.string().length(6, 'OTP must be 6 characters'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
