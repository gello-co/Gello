import express from "express";
import { getAllUsers } from "../../lib/database/users.db.js";
import { TaskService } from "../../lib/services/task.service.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

function getSupabase(req: express.Request) {
  if (!req.supabase) {
    throw new Error("Supabase client is not available on the request context.");
  }
  return req.supabase;
}

router.get(
  "/tasks-admin",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) throw new Error("User not authenticated");

      const supabase = getSupabase(req);
      const dbUsers = await getAllUsers(supabase);
      const users = dbUsers.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        email: u.email,
      }));
      // TODO: Implement getAllTasks or getTasksForAdmin method to fetch assignedTasks
      const assignedTasks: Array<unknown> = [];

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

    const supabase = getSupabase(req);
    const taskService = new TaskService(supabase);
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
