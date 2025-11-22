import express from "express";
import { LeaderboardService } from "../../../lib/services/leaderboard.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../../middleware/requireAuth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    const leaderboardService = new LeaderboardService(getSupabaseClient());
    const leaderboard = await leaderboardService.getLeaderboard(100);

    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);
    const isManager = req.user.role === "manager" || req.user.role === "admin";

    res.render("leaderboard/index", {
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      topThree,
      others,
      isManager,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

