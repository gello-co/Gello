import express from "express";
import { LeaderboardService } from "../../lib/services/leaderboard.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../../server/middleware/requireAuth.js";

const router = express.Router();

router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");
    
    const leaderboardService = new LeaderboardService(getSupabaseClient());
    const leaderboard = await leaderboardService.getLeaderboard(100);

    res.render("pages/leaderboard/index", {
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
