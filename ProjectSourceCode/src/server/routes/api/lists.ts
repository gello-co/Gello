import type { Request } from "express";
import express from "express";
import {
  createListSchema,
  reorderListsSchema,
  updateListSchema,
} from "../../../lib/schemas/list.js";
import { ListService } from "../../../lib/services/list.service.js";
import { getSupabaseClientForRequest } from "../../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireManager } from "../../middleware/requireManager.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

async function getListService(req: Request) {
  const client = await getSupabaseClientForRequest(req);
  return new ListService(client);
}

router.get("/boards/:boardId/lists", requireAuth, async (req, res, next) => {
  try {
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({ error: "boardId parameter is required" });
    }
    const lists = await (await getListService(req)).getListsByBoard(boardId);
    res.json(lists);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/boards/:boardId/lists",
  requireManager,
  validate(createListSchema),
  async (req, res, next) => {
    try {
      const boardId = req.params.boardId;
      if (!boardId) {
        return res.status(400).json({ error: "boardId parameter is required" });
      }
      const list = await (await getListService(req)).createList({
        ...req.body,
        board_id: boardId,
      });
      res.status(201).json(list);
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
    const list = await (await getListService(req)).getList(id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  requireManager,
  validate(updateListSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const list = await (await getListService(req)).updateList({
        ...req.body,
        id,
      });
      res.json(list);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/reorder",
  requireManager,
  validate(reorderListsSchema),
  async (req, res, next) => {
    try {
      await (await getListService(req)).reorderLists({
        board_id: req.body.board_id,
        list_positions: req.body.list_positions,
      });
      res.status(204).send();
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
    await (await getListService(req)).deleteList(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
