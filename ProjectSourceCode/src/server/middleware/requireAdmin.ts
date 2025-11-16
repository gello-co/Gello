import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }
    next();
  });
}
