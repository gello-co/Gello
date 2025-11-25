import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth.js";

export function requireManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    // requireAuth guarantees req.user is set when it calls next()
    // Type assertion needed because TypeScript doesn't track this guarantee
    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth
    const user = req.user!;
    if (user.role !== "admin" && user.role !== "manager") {
      return res
        .status(403)
        .json({ error: "Forbidden: Manager or Admin access required" });
    }
    next();
  });
}
