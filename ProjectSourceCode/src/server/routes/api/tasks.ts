import type { Request } from "express";
import express from "express";
import {
  assignTaskSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "../../../lib/schemas/task.js";
import { PointsService } from "../../../lib/services/points.service.js";
import { TaskService } from "../../../lib/services/task.service.js";
import { getSupabaseClientForRequest } from "../../../lib/supabase.js";
import { canManageTask } from "../../../lib/utils/permissions.js";
import { retryWithBackoff } from "../../../lib/utils/retry.js";
import { logger } from "../../lib/logger.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireManager } from "../../middleware/requireManager.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

async function getTaskService(req: Request) {
  const client = await getSupabaseClientForRequest(req);
  return new TaskService(client);
}

async function getPointsService(req: Request, userId?: string) {
  const client = await getSupabaseClientForRequest(req);
  return new PointsService(client, userId);
}

router.get("/lists/:listId/tasks", requireAuth, async (req, res, next) => {
  try {
    const listId = req.params.listId;
    // biome-ignore lint/style/noNonNullAssertion: Express route params are guaranteed to exist
    const tasks = await (await getTaskService(req)).getTasksByList(listId!);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/lists/:listId/tasks",
  requireManager,
  validate(createTaskSchema),
  async (req, res, next) => {
    try {
      const listId = req.params.listId;
      const task = await (await getTaskService(req)).createTask({
        ...req.body,
        list_id: listId,
      });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    // biome-ignore lint/style/noNonNullAssertion: Express route params are guaranteed to exist
    const task = await (await getTaskService(req)).getTask(id!);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  requireManager,
  validate(updateTaskSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const task = await (await getTaskService(req)).updateTask({
        ...req.body,
        id,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/move",
  requireManager,
  validate(moveTaskSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const task = await (await getTaskService(req)).moveTask({
        ...req.body,
        id,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/assign",
  requireManager,
  validate(assignTaskSchema),
  async (req, res, next) => {
    try {
      const task = await (await getTaskService(req)).assignTask({
        ...req.body,
        id: req.params.id,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.patch("/:id/complete", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Load the task to check existence and authorization
    const task = await (await getTaskService(req)).getTask(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check authorization: user must be assigned to the task OR be a manager/admin
    const isAssigned = task.assigned_to === req.user.id;
    const isManager = canManageTask(req.user.role);

    if (!isAssigned && !isManager) {
      return res.status(403).json({
        error: "Forbidden",
        message:
          "You can only complete tasks assigned to you, or you must be a manager",
      });
    }

    // Complete the task
    const completedTask = await (await getTaskService(req)).completeTask(id);

    // Attempt to award points with retry logic for transient errors
    // If this fails after retries, log for reconciliation but don't fail the request
    // since the task is already completed
    const userId = req.user.id;
    try {
      await retryWithBackoff(
        () =>
          getPointsService(req, userId).then((service) =>
            service.awardPointsForTaskCompletion(id, userId),
          ),
        3,
        100,
      );
    } catch (pointsError) {
      // Log the failure with context for reconciliation
      // Only reached after all retries have been exhausted
      // Task is already completed, so we return success but log the points failure
      logger.error(
        {
          taskId: id,
          userId: userId,
          error: {
            name: pointsError instanceof Error ? pointsError.name : "Unknown",
            message:
              pointsError instanceof Error
                ? pointsError.message
                : String(pointsError),
            stack:
              process.env.NODE_ENV === "development" &&
              pointsError instanceof Error
                ? pointsError.stack
                : undefined,
          },
          context: "task_completion_points_award_failed_after_retries",
        },
        "Failed to award points for task completion after retries - requires reconciliation",
      );
      // Continue execution - task is completed, points will need manual reconciliation
    }

    // Always return the completed task, even if points award failed
    res.json(completedTask);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireManager, async (req, res, next) => {
  try {
    const id = req.params.id;
    // biome-ignore lint/style/noNonNullAssertion: Express route params are guaranteed to exist
    await (await getTaskService(req)).deleteTask(id!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
