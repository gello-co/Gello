import { Router } from "express";
import { z } from "zod";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/lib/errors/app.errors.js";
import {
  createListSchema,
  listIdSchema,
  reorderListsSchema,
  updateListSchema,
} from "@/lib/schemas/list.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { requireManager } from "@/middleware/requireManager.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middleware/validation.js";

const router = Router();

const listQuerySchema = z.object({
  board_id: z.string().uuid("Invalid board ID"),
});

router.get(
  "/",
  requireAuth,
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      const lists = await service.getListsByBoard(req.query.board_id as string);
      res.json(lists);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id",
  requireAuth,
  validateParams(listIdSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      const list = await service.getList(req.params.id as string);

      if (!list) {
        throw new ResourceNotFoundError(`List not found: ${req.params.id}`);
      }

      res.json(list);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  requireAuth,
  requireManager,
  validateBody(createListSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      const list = await service.createList(req.body);
      res.status(201).json(list);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireAuth,
  requireManager,
  validateParams(listIdSchema),
  validateBody(updateListSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      const list = await service.updateList({
        id: req.params.id,
        ...req.body,
      });
      res.json(list);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/reorder",
  requireAuth,
  requireManager,
  validateParams(listIdSchema),
  validateBody(reorderListsSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      const userId = res.locals.user?.id;

      // Validate list_positions contains valid UUIDs that belong to the board
      await service.reorderLists(req.body, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: "Validation error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  requireManager,
  validateParams(listIdSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.list;
      await service.deleteList(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
