import type { NextFunction, Request, Response } from "express";
import express from "express";
import {
  createBoardSchema,
  updateBoardSchema,
} from "../../../lib/schemas/board.js";
import { BoardService } from "../../../lib/services/board.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireManager } from "../../middleware/requireManager.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

/**
 * Middleware to attach BoardService to request
 * Instantiates BoardService once per request and attaches it to req.boardService
 */
function attachBoardService(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.boardService = new BoardService(getSupabaseClient());
  next();
}

router.get("/", requireAuth, attachBoardService, async (req, res, next) => {
  try {
    const teamId = req.query.team_id as string;
    if (teamId) {
      const boards = await req.boardService!.getBoardsByTeam(teamId);
      return res.json(boards);
    }
    res.status(400).json({ error: "team_id query parameter is required" });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, attachBoardService, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const board = await req.boardService!.getBoard(id);
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json(board);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireManager,
  attachBoardService,
  validate(createBoardSchema),
  async (req, res, next) => {
    try {
      const board = await req.boardService!.createBoard({
        ...req.body,
        created_by: req.user?.id ?? null,
      });
      res.status(201).json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireManager,
  attachBoardService,
  validate(updateBoardSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const board = await req.boardService!.updateBoard({
        ...req.body,
        id,
      });
      res.json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireManager,
  attachBoardService,
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      await req.boardService!.deleteBoard(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
