/**
 * Middleware to make user object available to all views via res.locals
 * This ensures the user is available in all templates, including partials like navbar
 */
import type { NextFunction, Request, Response } from "express";

export const userToLocals = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Make user available to all templates
  res.locals.user = req.user;
  next();
};
