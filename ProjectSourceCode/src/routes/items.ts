import express from "express";
import { getSupabaseClientForRequest } from "../lib/supabase.js"
import { validate } from "../middleware/validation.js"
import { createItemSchema } from "../schemas/item.js"
import { ItemService } from "../services/item.services.js";
const router = express.Router();

router.get("/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const supabaseClient = await getSupabaseClientForRequest(req);
    const itemService = new ItemService(supabaseClient);
    const item = await itemService.getItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
    } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  validate(createItemSchema),
  async (req, res, next) => {
    try {
      const supabaseClient = await getSupabaseClientForRequest(req);
      const itemService = new ItemService(supabaseClient);
      const newItem = await itemService.createItem(req.body);
      res.status(201).json(newItem);
    } catch (error) {
      next(error);
    }
  }
);

router.put("/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const supabaseClient = await getSupabaseClientForRequest(req);
    const itemService = new ItemService(supabaseClient);
    const updatedItem = await itemService.updateItem({ id: itemId, ...req.body });
    res.json(updatedItem);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const supabaseClient = await getSupabaseClientForRequest(req);
    const itemService = new ItemService(supabaseClient);
    await itemService.deleteItem(itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}); 

router.post("/:id/assign/:userId", async (req, res, next) => {
    try {
        const itemId = req.params.id;
        const userId = req.params.userId;
        const supabaseClient = await getSupabaseClientForRequest(req);
        const { createUserItemAssociation } = await import("../db/items.db.js");
        await createUserItemAssociation(supabaseClient, userId, itemId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.delete("/:id/unassign/:userId", async (req, res, next) => {
    try {
        const itemId = req.params.id;
        const userId = req.params.userId;
        const supabaseClient = await getSupabaseClientForRequest(req);
        const { deleteUserItemAssociation } = await import("../db/items.db.js");
        await deleteUserItemAssociation(supabaseClient, userId, itemId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
export default router;