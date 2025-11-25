import express from "express";
import { PointsService } from "../../lib/services/points.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

router.get("/points-shop", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");
    const pointsService = new PointsService(getSupabaseClient(), req.user.id);
    const pointsHistory = await pointsService.getPointsHistory(req.user.id);
    const totalPoints = await pointsService.getUserPoints(req.user.id);

    res.render("pages/points-shop/index", {
      title: "Points Shop",
      layout: "dashboard",
      user: req.user,
      pointsHistory,
      totalPoints,
      // Pass any other data needed by the view
    });
  } catch (error) {
    next(error);
  }
});

export default router;
