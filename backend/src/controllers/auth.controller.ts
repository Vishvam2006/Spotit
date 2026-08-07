import type { NextFunction, Request, Response } from "express";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { getUserById, loginUser, registerUser } from "../services/auth.service";
import { generateToken } from "../utils/generateToken";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log("Register request body:", req.body); // Log the request body for debugging
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
