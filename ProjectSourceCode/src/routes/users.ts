/** 
 * routes for user-related operations
 * this should include managing user points
 * for both managerial users and standard users
 */
import express from "express";
import { getSupabaseClient } from "../lib/supabase.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("users").select("*");
  res.json(data);
});

router.post("/", async (req, res) => {
    //probably will only be used in the backend for creating users
    
});

router.put("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("users")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  await supabase.from("users").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

export default router;