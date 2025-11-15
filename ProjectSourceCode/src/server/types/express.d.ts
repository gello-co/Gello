import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: "admin" | "team_member";
      } | null;
      /**
       * CSRF token method added by csurf middleware
       * Available when csrfProtection middleware is applied
       */
      csrfToken?: () => string;
    }
  }
}

export {};
