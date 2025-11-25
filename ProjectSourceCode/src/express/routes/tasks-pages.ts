import express from "express";
import { getAllUsers } from "../../lib/database/users.db.js";
import { TaskService } from "../../lib/services/task.service.js";
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

      const users = await getAllUsers(req.supabase!);
      // TODO: Implement getAllTasks or getTasksForAdmin method to fetch assignedTasks
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

    // Use the authenticated client from requireAuth middleware
    const taskService = new TaskService(req.supabase!);
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
