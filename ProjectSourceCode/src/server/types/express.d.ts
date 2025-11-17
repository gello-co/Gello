import type { Request } from "express";
import type { BoardService } from "../../lib/services/board.service.js";

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
      boardService?: BoardService;
      // CSRF types deferred to v0.2.0
      // csrfToken?: () => string;
    }
  }
}

export {};
