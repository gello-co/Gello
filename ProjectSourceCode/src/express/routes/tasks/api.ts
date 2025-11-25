import { Router } from "express";
import { z } from "zod";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/lib/schemas/task.js";
import { TaskService } from "@/lib/services/task.service.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middleware/validation.js";

const router = Router();

const listQuerySchema = z
  .object({
    list_id: z.string().uuid().optional(),
    assignee_id: z.string().uuid().optional(),
  })
  .refine((data) => data.list_id || data.assignee_id, {
    message: "Provide list_id or assignee_id",
  });

router.get(
  "/",
  requireAuth,
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new TaskService(req.supabase);
      if (req.query.list_id) {
        const tasks = await service.getTasksByList(req.query.list_id as string);
        return res.json(tasks);
      }
      if (req.query.assignee_id) {
        const tasks = await service.getTasksByAssignee(
          req.query.assignee_id as string,
        );
        return res.json(tasks);
      }
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  "/",
  requireAuth,
  validateBody(createTaskSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new TaskService(req.supabase);
      const task = await service.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireAuth,
  validateParams(taskIdSchema),
  validateBody(updateTaskSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new TaskService(req.supabase);
      const task = await service.updateTask({
        id: req.params.id,
        ...req.body,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  validateParams(taskIdSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new TaskService(req.supabase);
      await service.deleteTask(req.params.id as string);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
