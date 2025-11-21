import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    // requireAuth guarantees req.user is set when it calls next()
    // Type assertion needed because TypeScript doesn't track this guarantee
    const user = req.user!;
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }
    next();
  });
}
