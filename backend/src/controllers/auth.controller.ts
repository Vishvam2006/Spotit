import type { NextFunction, Request, Response } from "express";
import { loginSchema, registerSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from "../validators/auth.validator";
import { getUserById, loginUser, registerUser, sendPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp } from "../services/auth.service";
import { generateToken } from "../utils/generateToken";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const user = await loginUser(data);
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ success: true, token, user });
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getUserById(req.user!.id);

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await sendPasswordResetOtp(email);
    res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
      return;
    }
    next(error);
  }
}

export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    await verifyPasswordResetOtp(email, otp);
    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const user = await resetPasswordWithOtp(data);
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    res.json({ success: true, message: 'Password reset successfully.', token, user });
  } catch (error) {
    next(error);
  }
}
