import express from "express";
import { z } from "zod";
import { manualAwardSchema } from "../../../lib/schemas/points.js";
import { LeaderboardService } from "../../../lib/services/leaderboard.service.js";
import { PointsService } from "../../../lib/services/points.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

function getLeaderboardService() {
  return new LeaderboardService(getSupabaseClient());
}

function getPointsService(userId?: string) {
  return new PointsService(getSupabaseClient(), userId);
}

router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    const leaderboardService = getLeaderboardService();
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit as string, 10) || 100, 1),
      1000,
    );
    const leaderboard = await leaderboardService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

router.get("/users/:id/points", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    // Validate UUID format
    const uuidValidation = z.uuid().safeParse(id);
    if (!uuidValidation.success) {
      return res.status(400).json({ error: "id must be a valid UUID" });
    }
    const pointsService = getPointsService(req.user?.id);
    const points = await pointsService.getUserPoints(id);
    res.json({ user_id: id, total_points: points });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/users/:id/points",
  requireAdmin,
  validate(manualAwardSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      // Validate UUID format
      const uuidValidation = z.uuid().safeParse(id);
      if (!uuidValidation.success) {
        return res.status(400).json({ error: "id must be a valid UUID" });
      }
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const pointsService = getPointsService(req.user.id);
      const history = await pointsService.awardManualPoints(
        {
          ...req.body,
          user_id: id,
        },
        req.user.id,
      );
      res.status(201).json(history);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
