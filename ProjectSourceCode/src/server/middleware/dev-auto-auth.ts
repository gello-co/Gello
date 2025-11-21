import { createClient, type Session } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { logger } from "../lib/logger.js";

type CachedSession = Pick<
  Session,
  "access_token" | "refresh_token" | "expires_at"
>;

let cachedSession: CachedSession | null = null;
let inFlightPromise: Promise<CachedSession | null> | null = null;

const autoLoginEmail = process.env.AUTO_DEV_LOGIN_EMAIL ?? "";
const autoLoginPassword = process.env.AUTO_DEV_LOGIN_PASSWORD ?? "";

const isBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_TEST_BYPASS === undefined ||
    process.env.ALLOW_TEST_BYPASS === "true");

const hasDevCredentials = Boolean(autoLoginEmail) && Boolean(autoLoginPassword);

const shouldAutoBypass = isBypassEnabled && hasDevCredentials;

if (isBypassEnabled) {
  logger.info(
    {
      autoLoginConfigured: hasDevCredentials,
      autoLoginEmail,
    },
    "[dev-auto-auth] ALLOW_TEST_BYPASS enabled for development",
  );
  if (!hasDevCredentials) {
    logger.warn(
      "[dev-auto-auth] AUTO_DEV_LOGIN_EMAIL/PASSWORD not set; automatic admin login is disabled",
    );
  }
} else {
  logger.debug(
    "[dev-auto-auth] ALLOW_TEST_BYPASS disabled (set ALLOW_TEST_BYPASS=false to keep it off explicitly).",
  );
}

async function getDevSession(): Promise<CachedSession | null> {
  if (
    !shouldAutoBypass ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !autoLoginEmail ||
    !autoLoginPassword
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedSession && (cachedSession.expires_at ?? 0) > now + 60) {
    return cachedSession;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

  inFlightPromise = supabase.auth
    .signInWithPassword({
      email: autoLoginEmail,
      password: autoLoginPassword,
    })
    .then(({ data, error }) => {
      if (error || !data.session) {
        logger.warn(
          {
            error: error?.message,
            email: autoLoginEmail,
          },
          "[dev-auto-auth] Failed to sign in automatically",
        );
        return null;
      }
      cachedSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token ?? "",
        expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000),
      };
      logger.info(
        {
          email: autoLoginEmail,
          expiresAt: cachedSession.expires_at,
        },
        "[dev-auto-auth] Cached Supabase session refreshed for development bypass",
      );
      return cachedSession;
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

export async function devAutoAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!shouldAutoBypass) {
    return next();
  }

  if (req.cookies?.["sb-access-token"]) {
    return next();
  }

  try {
    const session = await getDevSession();
    if (!session) {
      return next();
    }

    res.cookie("sb-access-token", session.access_token, {
      httpOnly: true,
      sameSite: "lax",
    });
    res.cookie("sb-refresh-token", session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
    });
    req.cookies = {
      ...req.cookies,
      "sb-access-token": session.access_token,
      "sb-refresh-token": session.refresh_token,
    };
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "[dev-auto-auth] Error ensuring automatic session",
    );
  }

  next();
}
