import type { Request } from "express";
import { Router } from "express";
import {
  boardIdSchema,
  createBoardSchema,
  updateBoardBodySchema,
} from "@/lib/schemas/board.js";
import { BoardService } from "@/lib/services/board.service.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { validateBody, validateParams } from "@/middleware/validation.js";

const router = Router();

function getSupabase(req: Request) {
  if (!req.supabase) {
    throw new Error("Supabase client is not available on the request context.");
  }

  return req.supabase;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const service = new BoardService(getSupabase(req));
    const boards = await service.getBoardsForUser(req.user.id);
    res.json(boards);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  validateBody(createBoardSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const service = new BoardService(getSupabase(req));
      const board = await service.createBoard({
        ...req.body,
        created_by: req.user.id,
      });
      res.status(201).json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireAuth,
  validateParams(boardIdSchema),
  validateBody(updateBoardBodySchema),
  async (req, res, next) => {
    try {
      const service = new BoardService(getSupabase(req));
      const board = await service.updateBoard({
        id: req.params.id,
        ...req.body,
      });
      res.json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  validateParams(boardIdSchema),
  async (req, res, next) => {
    try {
      const service = new BoardService(getSupabase(req));
      await service.deleteBoard(req.params.id as string);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
