import express from "express";
import { isMockMode } from "../../../contracts/container.js";
import { MOCK_LEADERBOARD } from "../../../contracts/fixtures/index.js";
import { LeaderboardService } from "../../../lib/services/leaderboard.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    let leaderboard: typeof MOCK_LEADERBOARD = [];

    if (isMockMode()) {
      leaderboard = MOCK_LEADERBOARD;
    } else {
      const leaderboardService = new LeaderboardService(getSupabaseClient());
      leaderboard = await leaderboardService.getLeaderboard(100);
    }

    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);
    const isManager = req.user.role === "manager" || req.user.role === "admin";

    res.render(
      "leaderboard/index",
      withMockFlag({
        title: "Leaderboard",
        layout: "dashboard",
        user: req.user,
        topThree,
        others,
        isManager,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
