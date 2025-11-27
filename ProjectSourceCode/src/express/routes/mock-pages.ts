/**
 * Mock-Aware Page Routes
 *
 * These routes use the contracts system and work in both mock and real modes.
 * UI/UX developers can use these routes with `bun run dev:mock` to work
 * without a database connection.
 */

import express from "express";
import { getServices, isMockMode } from "../../contracts/container.js";
import {
  MOCK_BOARDS,
  MOCK_LEADERBOARD,
  MOCK_POINTS_HISTORY,
  MOCK_TASKS,
} from "../../contracts/fixtures/index.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

// =============================================================================
// Public Routes (no auth required)
// =============================================================================

/**
 * GET /about - About page
 */
router.get("/about", (_req, res) => {
  res.render(
    "pages/about",
    withMockFlag({
      title: "About",
      layout: "main",
    }),
  );
});

// =============================================================================
// Protected Routes (auth required)
// =============================================================================

/**
 * GET /dashboard - Main dashboard
 *
 * In mock mode: Uses fixture data
 * In real mode: Falls back to Supabase (not yet implemented)
 */
router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const services = getServices();
    const userId = req.user?.id;

    if (!userId) {
      return res.redirect("/login");
    }

    // Get data from contracts (works in both mock and real mode)
    let stats = { assignedTasks: 0, boards: 0, rank: 0 };
    let recentTasks: typeof MOCK_TASKS = [];

    if (isMockMode()) {
      // Use fixture data directly for mock mode
      const userTasks = MOCK_TASKS.filter((t) => t.assigned_to === userId);
      const userBoards = MOCK_BOARDS.filter(
        (b) => b.team_id === req.user?.team_id,
      );
      const userRank =
        MOCK_LEADERBOARD.find((l) => l.user_id === userId)?.rank ?? 0;

      stats = {
        assignedTasks: userTasks.length,
        boards: userBoards.length,
        rank: userRank,
      };
      recentTasks = userTasks.slice(0, 5);
    } else {
      // Real mode - use services (to be implemented)
      const tasks = await services.tasks.getByAssignee(userId);
      stats = {
        assignedTasks: tasks.length,
        boards: 0, // TODO: implement boards.getByUser
        rank: 0, // TODO: implement leaderboard.getRank
      };
      recentTasks = tasks.slice(0, 5);
    }

    res.render(
      "pages/dashboard",
      withMockFlag({
        title: "Dashboard",
        layout: "dashboard",
        user: req.user,
        stats,
        recentTasks,
      }),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /profile/mock - Profile using contracts
 *
 * Alternative profile route that uses the contracts system
 */
router.get("/profile/mock", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.redirect("/login");
    }

    let pointsHistory: typeof MOCK_POINTS_HISTORY = [];
    let assignedTasks: typeof MOCK_TASKS = [];

    if (isMockMode()) {
      pointsHistory = MOCK_POINTS_HISTORY.filter((p) => p.user_id === userId);
      assignedTasks = MOCK_TASKS.filter((t) => t.assigned_to === userId);
    } else {
      const services = getServices();
      assignedTasks = await services.tasks.getByAssignee(userId);
      // TODO: implement points history in real mode
    }

    res.render(
      "pages/profile/index",
      withMockFlag({
        title: "Profile",
        layout: "dashboard",
        user: req.user,
        pointsHistory,
        assignedTasks,
      }),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /leaderboard/mock - Leaderboard using contracts
 */
router.get("/leaderboard/mock", requireAuth, async (req, res, _next) => {
  const leaderboard = isMockMode() ? MOCK_LEADERBOARD : [];

  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);
  const isManager = req.user?.role === "manager" || req.user?.role === "admin";

  res.render(
    "pages/leaderboard/index",
    withMockFlag({
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      topThree,
      others,
      isManager,
    }),
  );
});

export default router;
