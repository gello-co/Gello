/**
 * CSRF Protection Middleware using csrf-csrf
 * Generates and validates CSRF tokens for state-changing requests
 * Implements Double Submit Cookie Pattern for enhanced security
 */

import crypto from "node:crypto";
import { doubleCsrf } from "csrf-csrf";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

// Initialize CSRF protection with Double Submit Cookie Pattern
const isProduction = process.env.NODE_ENV === "production";

/**
 * Get CSRF secret for HMAC generation
 *
 * Architecture (per csrf-csrf documentation):
 * - getSecret is called per-request and should return a stable secret
 * - The secret should be cryptographically pseudorandom and consistent across requests
 * - The secret must be the same for token generation and validation to work
 *
 * Implementation:
 * - Reads from process.env.CSRF_SECRET (populated by doppler, containerEnv, or environment)
 * - In production: Required, throws error if missing
 * - In development: Generates temporary secret if missing (with warning)
 * - The secret is initialized once at module load to ensure stability
 * - The secret MUST NOT change during the process lifetime
 */

/**
 * Initialize CSRF secret once at module load to ensure stability
 * The secret MUST NOT change during the process lifetime
 */
function initializeCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;

  // Production - require secret
  if (isProduction) {
    if (!secret || secret.trim() === "") {
      throw new Error(
        "CSRF_SECRET environment variable is required in production. " +
          "Set a secure random 64+ character string in your environment variables.",
      );
    }
    return secret;
  }

  // Development - use env var if available, otherwise generate
  if (secret && secret.trim() !== "") {
    return secret;
  }

  const generated = crypto.randomBytes(32).toString("hex");
  logger.warn(
    "WARNING: CSRF_SECRET not set. Using generated temporary secret. This secret will change on each restart. Set CSRF_SECRET in your environment for persistent sessions.",
  );
  logger.warn(
    "To fix: Ensure CSRF_SECRET is set in Doppler or containerEnv before server starts.",
  );
  logger.warn(
    "Note: If using doppler run, ensure CSRF_SECRET is set in Doppler secrets.",
  );
  return generated;
}

// Initialize once at module load - NEVER change this during runtime
const CSRF_SECRET = initializeCsrfSecret();

function getCsrfSecret(): string {
  return CSRF_SECRET;
}

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: getCsrfSecret,
  getSessionIdentifier: (req) => {
    // For cookie-based auth (Supabase), use a stable identifier
    // Use user ID if authenticated
    if (req.user?.id) {
      const identifier = req.user.id;
      if (!isProduction) {
        console.debug(
          `[CSRF] Session identifier: ${identifier} (authenticated user)`,
        );
      }
      return identifier;
    }
    // For anonymous users, use a constant identifier
    // The Double Submit Cookie Pattern relies on cookie + token matching,
    // not on session-based secrets, so a constant is safe for anonymous users
    if (!isProduction) {
      console.debug("[CSRF] Session identifier: anonymous (unauthenticated)");
    }
    return "anonymous";
  },
  // Use __Host- prefix only in production (requires secure: true)
  cookieName: isProduction ? "__Host-csrf" : "csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => {
    // Check X-CSRF-Token header first (for API calls)
    // Express normalizes headers to lowercase
    const headerToken =
      req.headers["x-csrf-token"] || req.headers["X-CSRF-Token"];
    if (headerToken && typeof headerToken === "string") {
      if (!isProduction) {
        console.debug(
          `[CSRF] Token found in header: ${headerToken.substring(0, 20)}...`,
        );
      }
      return headerToken;
    }
    // Check _csrf body field (for form submissions)
    if (req.body?._csrf) {
      if (!isProduction) {
        console.debug(
          `[CSRF] Token found in body: ${req.body._csrf.substring(0, 20)}...`,
        );
      }
      return req.body._csrf as string;
    }
    if (!isProduction) {
      console.debug("[CSRF] No token found in request (header or body)");
    }
    return null;
  },
});

// Wrap CSRF protection with debug logging in development
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!isProduction) {
    const method = req.method;
    const path = req.path;
    const hasCookie = req.cookies?.csrf || req.cookies?.["__Host-csrf"];

    // Only log for state-changing methods
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      console.debug(`[CSRF] Validating ${method} ${path}`);
      console.debug(`[CSRF] Cookie present: ${!!hasCookie}`);
    }
  }

  return doubleCsrfProtection(req, res, next);
};

// Export generateCsrfToken for use in debug endpoint
export { generateCsrfToken };

/**
 * Middleware to make CSRF token available to all views via res.locals
 */
export function csrfTokenToLocals(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate CSRF token and make it available to all views
  const token = generateCsrfToken(req, res);
  res.locals.csrfToken = token;

  if (!isProduction) {
    console.debug(
      `[CSRF] Generated token for view: ${token.substring(0, 20)}...`,
    );
    const sessionId = req.user?.id || "anonymous";
    console.debug(`[CSRF] Session identifier: ${sessionId}`);
  }

  next();
}

/**
 * Endpoint handler to get CSRF token for client-side requests
 * Reuses token from csrfTokenToLocals if available to avoid double generation
 */
export function getCsrfToken(req: Request, res: Response): void {
  // If token was already generated by csrfTokenToLocals middleware, reuse it
  // This prevents generating two different tokens in the same request
  const token = res.locals.csrfToken || generateCsrfToken(req, res);
  res.json({ csrfToken: token });
}
