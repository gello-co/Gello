import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth.js";

export function requireManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    if (
      !req.user ||
      (req.user.role !== "admin" && req.user.role !== "manager")
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Manager or Admin access required" });
    }
    next();
  });
}
