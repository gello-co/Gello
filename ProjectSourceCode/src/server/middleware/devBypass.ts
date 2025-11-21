import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";

let bypassLogged = false;

/**
 * Dev bypass middleware that automatically authenticates all requests
 * when DEV_BYPASS_AUTH is enabled via environment variable.
 * This allows developers to access all pages without authentication.
 */
export const devBypassAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (env.DEV_BYPASS_AUTH === "true") {
    // Log on first request that bypass is active
    if (!bypassLogged) {
      console.log(
        "⚠️  DEV BYPASS ACTIVE: Authentication bypassed for all requests"
      );
      bypassLogged = true;
    }

    // Set a mock dev user on the request
    req.user = {
      id: "dev-user-id",
      username: "dev-user",
      email: "dev@example.com",
      role: "admin", // Admin role to access all pages
    };
  }
  next();
};
