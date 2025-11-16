import express from "express";
import {
  createListSchema,
  reorderListsSchema,
  updateListSchema,
} from "../../../lib/schemas/list.js";
import { ListService } from "../../../lib/services/list.service.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireManager } from "../../middleware/requireManager.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

function getListService() {
  return new ListService(getSupabaseClient());
}

router.get("/boards/:boardId/lists", requireAuth, async (req, res, next) => {
  try {
    const boardId = req.params.boardId;
    if (!boardId) {
      return res.status(400).json({ error: "boardId parameter is required" });
    }
    const lists = await getListService().getListsByBoard(boardId);
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
      const list = await getListService().createList({
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
    const list = await getListService().getList(id);
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
      const list = await getListService().updateList({
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
      await getListService().reorderLists({
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
    await getListService().deleteList(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
