import express from "express";
import { isMockMode } from "../../contracts/container.js";
import {
  MOCK_POINTS_HISTORY,
  MOCK_USERS,
} from "../../contracts/fixtures/index.js";
import { PointsService } from "../../lib/services/points.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

router.get("/points-shop", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    let pointsHistory: typeof MOCK_POINTS_HISTORY = [];
    let totalPoints = 0;

    if (isMockMode()) {
      pointsHistory = MOCK_POINTS_HISTORY.filter(
        (p) => p.user_id === req.user?.id,
      );
      // Calculate total points from user fixture
      const mockUser = MOCK_USERS.find((u) => u.id === req.user?.id);
      totalPoints = mockUser?.total_points ?? 0;
    } else {
      const pointsService = new PointsService(getSupabaseClient(), req.user.id);
      pointsHistory = await pointsService.getPointsHistory(req.user.id);
      totalPoints = await pointsService.getUserPoints(req.user.id);
    }

    res.render(
      "pages/points-shop/index",
      withMockFlag({
        title: "Points Shop",
        layout: "dashboard",
        user: req.user,
        pointsHistory,
        totalPoints,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
