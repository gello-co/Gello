import express from "express";
import type { Request } from "express";
import { TaskService } from "../services/task.service.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const router = express.Router();

router.get(
  "/tasks-admin",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) 
        throw new Error("User not authenticated");

      const _taskService = new TaskService(getSupabaseClient());

      // TODO: Add method to get all tasks for admin or filter by team

      res.render("pages/tasks-admin", {
        title: "Tasks Administration",
        layout: "dashboard",
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/tasks-team", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    const taskService = new TaskService(getSupabaseClient());
    const tasks = await taskService.getTasksByAssignee(req.user.id);

    res.render("pages/tasks-team", {
      title: "My Tasks",
      layout: "dashboard",
      user: req.user,
      tasks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
