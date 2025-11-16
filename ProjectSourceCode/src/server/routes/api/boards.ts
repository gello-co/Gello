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

function getBoardService() {
  return new BoardService(getSupabaseClient());
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const teamId = req.query.team_id as string;
    if (teamId) {
      const boards = await getBoardService().getBoardsByTeam(teamId);
      return res.json(boards);
    }
    res.status(400).json({ error: "team_id query parameter is required" });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const board = await getBoardService().getBoard(id);
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
  validate(createBoardSchema),
  async (req, res, next) => {
    try {
      const board = await getBoardService().createBoard({
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
  validate(updateBoardSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const board = await getBoardService().updateBoard({
        ...req.body,
        id,
      });
      res.json(board);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", requireManager, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    await getBoardService().deleteBoard(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
