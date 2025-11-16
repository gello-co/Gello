import express from "express";
import {
  assignTaskSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "../../../lib/schemas/task.js";
import { PointsService } from "../../../lib/services/points.service.js";
import { TaskService } from "../../../lib/services/task.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireManager } from "../../middleware/requireManager.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

function getTaskService() {
  return new TaskService(getSupabaseClient());
}

function getPointsService(userId?: string) {
  return new PointsService(getSupabaseClient(), userId);
}

router.get("/lists/:listId/tasks", requireAuth, async (req, res, next) => {
  try {
    const listId = req.params.listId;
    if (!listId) {
      return res.status(400).json({ error: "listId parameter is required" });
    }
    const tasks = await getTaskService().getTasksByList(listId);
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
      if (!listId) {
        return res.status(400).json({ error: "listId parameter is required" });
      }
      const task = await getTaskService().createTask({
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
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const task = await getTaskService().getTask(id);
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
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const task = await getTaskService().updateTask({
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
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const task = await getTaskService().moveTask({
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
      const task = await getTaskService().assignTask({
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

    const task = await getTaskService().completeTask(id);
    await getPointsService(req.user.id).awardPointsForTaskCompletion(
      id,
      req.user.id,
    );

    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireManager, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    await getTaskService().deleteTask(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
