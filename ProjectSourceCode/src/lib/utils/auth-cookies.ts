/**
 * Auth Cookie Utilities
 *
 * Centralized cookie handling for authentication.
 * Used by both form routes (PRG pattern) and JSON API routes.
 */
import type { Response } from "express";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Sets authentication cookies for access and refresh tokens.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("sb-access-token", accessToken, {
    ...COOKIE_OPTIONS,
    secure: isProduction,
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.cookie("sb-refresh-token", refreshToken, {
    ...COOKIE_OPTIONS,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clears authentication cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie("sb-access-token", { path: "/" });
  res.clearCookie("sb-refresh-token", { path: "/" });
}
