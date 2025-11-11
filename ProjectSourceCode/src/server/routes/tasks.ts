import express from "express";
import { getSupabaseClient } from "../../lib/supabase.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("tasks").select("*");
  res.json(data);
});

router.post("/", async (req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("tasks").insert(req.body).select().single();
  res.json(data);
});

router.put("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("tasks").update(req.body).eq("id", req.params.id).select().single();
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  await supabase.from("tasks").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

export default router;
