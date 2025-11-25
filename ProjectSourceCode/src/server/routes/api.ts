import express from "express";
// CSRF routes deferred to v0.2.0
// import {
//   csrfProtection,
//   generateCsrfToken,
//   getCsrfToken,
// } from "../middleware/csrf.js";
import authRoutes from "./api/auth.js";
import boardsRoutes from "./api/boards.js";
import listsRoutes from "./api/lists.js";
import pointsRoutes from "./api/points.js";
import tasksRoutes from "./api/tasks.js";
import teamsRoutes from "./api/teams.js";
import sseRoutes from "./sse.js";

const router = express.Router();

// CSRF routes deferred to v0.2.0
// router.get("/csrf-token", getCsrfToken);
// router.get("/csrf-debug", ...);

// API routes
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

// Note: Error handler is registered at app level in app.ts

//CRUD user routes

//"Create" user
router.post("/register", (req, res) => {
  const _username = req.body.username;
  const _email = req.body.email;
  try {
    res.status(200).send("Success");
  } catch (err) {
    console.log(err);
  }
});

//CRUD board routes

router.get("/viewBoards", async (_req, _res) => {});

router.post("/createBoard", async (_req, _res) => {});

router.put("/updateBoard", async (_req, _res) => {});

router.delete("/deleteBoard", async (_req, _res) => {});

export default router;
