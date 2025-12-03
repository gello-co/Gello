import { Router } from 'express';
import { z } from 'zod';
import { ForbiddenError, ResourceNotFoundError } from '@/lib/errors/app.errors.js';
import {
  assignTaskSchema,
  createTaskBodySchema,
  createTaskSchema,
  moveTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from '@/lib/schemas/task.js';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireManager } from '@/middleware/requireManager.js';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation.js';

const router = Router();

const listQuerySchema = z
  .object({
    list_id: z.string().uuid().optional(),
    assignee_id: z.string().uuid().optional(),
  })
  .refine((data) => data.list_id || data.assignee_id, {
    message: 'Provide list_id or assignee_id',
  });

const listIdParamSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
});

// ============================================================================
// LIST-BASED TASK ROUTES: /api/tasks/lists/:listId/tasks
// ============================================================================

router.get(
  '/lists/:listId/tasks',
  requireAuth,
  validateParams(listIdParamSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      // listId is guaranteed after validation
      const tasks = await service.getTasksByList(req.params.listId as string);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/lists/:listId/tasks',
  requireAuth,
  requireManager,
  validateParams(listIdParamSchema),
  validateBody(createTaskBodySchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      const task = await service.createTask({
        ...req.body,
        list_id: req.params.listId,
      });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// INDIVIDUAL TASK ROUTES: /api/tasks/:id
// ============================================================================

router.get('/:id', requireAuth, validateParams(taskIdSchema), async (req, res, next) => {
  try {
    const service = res.locals.services.task;
    // id is guaranteed after validation
    const task = await service.getTask(req.params.id as string);
    if (!task) {
      throw new ResourceNotFoundError(`Task not found: ${req.params.id}`);
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const service = res.locals.services.task;
    if (req.query.list_id) {
      const tasks = await service.getTasksByList(req.query.list_id as string);
      return res.json(tasks);
    }
    if (req.query.assignee_id) {
      const tasks = await service.getTasksByAssignee(req.query.assignee_id as string);
      return res.json(tasks);
    }
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireAuth,
  requireManager,
  validateBody(createTaskSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      const task = await service.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requireManager,
  validateParams(taskIdSchema),
  validateBody(updateTaskSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      const task = await service.updateTask({
        id: req.params.id,
        ...req.body,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// TASK ACTIONS: /api/tasks/:id/assign, /api/tasks/:id/complete, /api/tasks/:id/move
// ============================================================================

router.patch(
  '/:id/assign',
  requireAuth,
  requireManager,
  validateParams(taskIdSchema),
  validateBody(assignTaskSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      // assignTask expects an object with id and assigned_to
      const task = await service.assignTask({
        id: req.params.id as string,
        assigned_to: req.body.assigned_to,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id/complete', requireAuth, validateParams(taskIdSchema), async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskService = res.locals.services.task;
    const pointsService = res.locals.services.points;

    // id is guaranteed after validation
    const taskId = req.params.id as string;

    // Get the task first to check authorization
    const task = await taskService.getTask(taskId);
    if (!task) {
      throw new ResourceNotFoundError(`Task not found: ${taskId}`);
    }

    // Check if the task is assigned to the current user
    if (task.assigned_to !== req.user.id) {
      throw new ForbiddenError('You can only complete tasks assigned to you');
    }

    // Complete the task (sets completed_at timestamp)
    const completedTask = await taskService.completeTask(taskId);

    // Award points for task completion
    try {
      await pointsService.awardPointsForTaskCompletion(taskId, req.user.id);
    } catch {
      // Points may have already been awarded (idempotent) - continue anyway
    }

    // Check if this is an HTMX request (for partial rendering)
    if (req.headers['hx-request'] === 'true') {
      return res.render('partials/task-card', {
        layout: false,
        task: completedTask,
        user: req.user,
      });
    }

    res.json(completedTask);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id/move',
  requireAuth,
  requireManager,
  validateParams(taskIdSchema),
  validateBody(moveTaskSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      // moveTask expects an object with id, list_id, and position
      const task = await service.moveTask({
        id: req.params.id as string,
        list_id: req.body.list_id,
        position: req.body.position,
      });
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireManager,
  validateParams(taskIdSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.task;
      // id is guaranteed after validation
      await service.deleteTask(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
