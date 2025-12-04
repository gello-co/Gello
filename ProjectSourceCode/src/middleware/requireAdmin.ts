import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from './requireAuth.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    // requireAuth guarantees req.user is set when it calls next()
    // Type assertion needed because TypeScript doesn't track this guarantee
    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
}
