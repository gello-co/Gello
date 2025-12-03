import type { BoardService } from "../lib/services/board.service.js";
import type { LeaderboardService } from "../lib/services/leaderboard.service.js";
import type { ListService } from "../lib/services/list.service.js";
import type { PointsService } from "../lib/services/points.service.js";
import type { TaskService } from "../lib/services/task.service.js";

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
      supabase?: import("@supabase/supabase-js").SupabaseClient;
    }

    interface Locals {
      services: {
        board: BoardService;
        list: ListService;
        task: TaskService;
        points: PointsService;
        leaderboard: LeaderboardService;
      };
    }
  }
}
