import { Router } from "express";
import {
  boardIdSchema,
  createBoardSchema,
  updateBoardBodySchema,
} from "@/lib/schemas/board.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { requireManager } from "@/middleware/requireManager.js";
import { validateBody, validateParams } from "@/middleware/validation.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const service = res.locals.services.board;
    const boards = await service.getBoardsForUser(req.user.id);
    res.json(boards);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id",
  requireAuth,
  validateParams(boardIdSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const service = res.locals.services.board;
      const board = await service.getBoard(req.params.id as string);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  requireAuth,
  requireManager,
  validateBody(createBoardSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const service = res.locals.services.board;
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
  requireManager,
  validateParams(boardIdSchema),
  validateBody(updateBoardBodySchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.board;
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
  requireManager,
  validateParams(boardIdSchema),
  async (req, res, next) => {
    try {
      const service = res.locals.services.board;
      await service.deleteBoard(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
