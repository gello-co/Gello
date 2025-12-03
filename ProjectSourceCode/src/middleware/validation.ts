import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { logger } from "@/lib/logger.js";

export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(
          { error: error.issues, path: req.path },
          "Validation failed",
        );
        return res.status(400).json({
          error: "Validation failed",
          issues: error.issues,
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedQuery = await schema.parseAsync(req.query);
      // Since req.query is read-only, we copy parsed values back to it
      // First clear existing keys, then copy new values
      for (const key of Object.keys(req.query)) {
        delete (req.query as Record<string, unknown>)[key];
      }
      Object.assign(req.query, parsedQuery);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(
          { error: error.issues, path: req.path },
          "Query validation failed",
        );
        return res.status(400).json({
          error: "Query validation failed",
          issues: error.issues,
        });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedParams = (await schema.parseAsync(
        req.params,
      )) as Request["params"];
      req.params = parsedParams;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(
          { error: error.issues, path: req.path },
          "Params validation failed",
        );
        return res.status(400).json({
          error: "Params validation failed",
          issues: error.issues,
        });
      }
      next(error);
    }
  };
};

// Legacy validate function for backward compatibility
export const validate =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    return validateBody(schema)(req, res, next);
  };
