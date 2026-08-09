import { Request, Response, NextFunction } from "express";

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const role = req.user!.role;

  if (role !== "OWNER" && role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Owner or admin access required",
    });
  }

  next();
}
