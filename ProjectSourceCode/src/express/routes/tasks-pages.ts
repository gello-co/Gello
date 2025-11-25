import express from "express";
import { isMockMode } from "../../contracts/container.js";
import { MOCK_TASKS, MOCK_USERS } from "../../contracts/fixtures/index.js";
import { getAllUsers } from "../../lib/database/users.db.js";
import { TaskService } from "../../lib/services/task.service.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

router.get(
  "/tasks-admin",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) throw new Error("User not authenticated");

      let users: Array<{ id: string; display_name: string; email: string }> =
        [];
      let assignedTasks: typeof MOCK_TASKS = [];

      if (isMockMode()) {
        users = MOCK_USERS.map((u) => ({
          id: u.id,
          display_name: u.display_name,
          email: u.email,
        }));
        assignedTasks = MOCK_TASKS;
      } else {
        const dbUsers = await getAllUsers(req.supabase!);
        users = dbUsers.map((u) => ({
          id: u.id,
          display_name: u.display_name,
          email: u.email,
        }));
        // TODO: Implement getAllTasks or getTasksForAdmin method to fetch assignedTasks
      }

      res.render(
        "pages/tasks-admin",
        withMockFlag({
          title: "Tasks Administration",
          layout: "dashboard",
          user: req.user,
          users,
          assignedTasks,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get("/tasks-team", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    let tasks: typeof MOCK_TASKS = [];

    if (isMockMode()) {
      tasks = MOCK_TASKS.filter((t) => t.assigned_to === req.user?.id);
    } else {
      // Use the authenticated client from requireAuth middleware
      const taskService = new TaskService(req.supabase!);
      tasks = await taskService.getTasksByAssignee(req.user.id);
    }

    res.render(
      "pages/tasks-team",
      withMockFlag({
        title: "My Tasks",
        layout: "dashboard",
        user: req.user,
        tasks,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
