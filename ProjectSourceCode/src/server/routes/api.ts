import express from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import authRoutes from "./api/auth.js";
import boardsRoutes from "./api/boards.js";
import listsRoutes from "./api/lists.js";
import pointsRoutes from "./api/points.js";
import tasksRoutes from "./api/tasks.js";
import teamsRoutes from "./api/teams.js";
import sseRoutes from "./sse.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/teams", teamsRoutes);
router.use("/boards", boardsRoutes);
router.use("/lists", listsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/points", pointsRoutes);
router.use("/sse", sseRoutes);

router.use(errorHandler);

export default router;
