import express from "express";
import { getAllUsers } from "../../lib/database/users.db.js";
import { TaskService } from "../../lib/services/task.service.js";
import {
  getSupabaseClient,
  getSupabaseClientForRequest,
} from "../../lib/supabase.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

router.get(
  "/tasks-admin",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) throw new Error("User not authenticated");

      const client = await getSupabaseClientForRequest(req);
      const _taskService = new TaskService(client);
      // TODO: Add method to get all tasks for admin or filter by team

      const users = await getAllUsers(client);
      // TODO: Implement getAllTasks or getTasksForAdmin method to fetch assignedTasks
      // For now, passing empty array so template doesn't break
      const assignedTasks: never[] = [];

      res.render("pages/tasks-admin", {
        title: "Tasks Administration",
        layout: "dashboard",
        user: req.user,
        users,
        assignedTasks,
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
