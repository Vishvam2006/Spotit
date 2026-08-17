import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.user!.role;

  if (role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      code: "FORBIDDEN",
    });
  }

  next();
}