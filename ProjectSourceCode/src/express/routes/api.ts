import express from "express";
import { checkHealth } from "@/lib/services/health.service.js";
import authRoutes from "./auth-api.js";
import boardsRoutes from "./boards/api.js";
import listsRoutes from "./lists.js";
import pointsRoutes from "./points.js";
import sseRoutes from "./sse.js";
import tasksRoutes from "./tasks/api.js";
import teamsRoutes from "./teams.js";

const router = express.Router();

// CSRF routes deferred to v0.2.0
// router.get("/csrf-token", getCsrfToken);
// router.get("/csrf-debug", ...);

// Health and readiness endpoints
// /health - Liveness check (is the app running?)
// /ready - Readiness check (can it handle traffic? checks dependencies)
router.get("/health", async (_req, res, next) => {
  try {
    const status = await checkHealth();
    const statusCode = status.ok ? 200 : 503;
    res.status(statusCode).json(status);
  } catch (error) {
    next(error);
  }
});

router.get("/ready", async (_req, res, next) => {
  try {
    const status = await checkHealth();
    const statusCode = status.ok ? 200 : 503;
    res.status(statusCode).json({
      ready: status.ok,
      checks: {
        database: status.db,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/teams", teamsRoutes);
router.use("/boards", boardsRoutes);
router.use("/lists", listsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/points", pointsRoutes);
router.use("/sse", sseRoutes);

// Note: Error handler is registered at app level in app.ts

export default router;
