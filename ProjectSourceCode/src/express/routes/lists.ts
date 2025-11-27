import { Router } from "express";
import { z } from "zod";
import {
  createListSchema,
  listIdSchema,
  updateListSchema,
} from "@/lib/schemas/list.js";
import { ListService } from "@/lib/services/list.service.js";
import { requireAuth } from "@/middleware/requireAuth.js";
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
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new ListService(req.supabase);
      const lists = await service.getListsByBoard(req.query.board_id as string);
      res.json(lists);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  requireAuth,
  validateBody(createListSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new ListService(req.supabase);
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
  validateParams(listIdSchema),
  validateBody(updateListSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new ListService(req.supabase);
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

router.delete(
  "/:id",
  requireAuth,
  validateParams(listIdSchema),
  async (req, res, next) => {
    try {
      if (!req.supabase) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }
      const service = new ListService(req.supabase);
      await service.deleteList(req.params.id as string);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
