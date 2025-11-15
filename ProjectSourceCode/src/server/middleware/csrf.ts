/**
 * CSRF Protection Middleware using csurf
 * Generates and validates CSRF tokens for state-changing requests
 */

import csurf from "csurf";
import type { NextFunction, Request, Response } from "express";

// CSRF protection middleware
// Uses cookies to store the secret (more secure than session)
export const csrfProtection = csurf({ cookie: true });

/**
 * Middleware to make CSRF token available to all views via res.locals
 */
export function csrfTokenToLocals(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Make CSRF token available to all views
  res.locals.csrfToken = req.csrfToken();
  next();
}

/**
 * Endpoint handler to get CSRF token for client-side requests
 * Token is available via req.csrfToken() when csrfProtection middleware is applied
 */
export function getCsrfToken(req: Request, res: Response): void {
  // req.csrfToken() is available when csrfProtection middleware is applied
  const token = req.csrfToken();
  res.json({ csrfToken: token });
}
