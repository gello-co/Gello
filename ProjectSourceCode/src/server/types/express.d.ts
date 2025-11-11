import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        display_name: string;
        role: "admin" | "manager" | "member";
        team_id: string | null;
        total_points: number;
        avatar_url: string | null;
      } | null;
    }
  }
}

export {};
