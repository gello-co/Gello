import bcrypt from "bcrypt";
import express from "express";
import { getSupabaseClient } from "../../lib/supabase.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("users").select("*");
  res.json(data);
});

router.post("/", async (req, res) => {
  const supabase = getSupabaseClient();

  // Use 12 rounds for bcrypt (recommended security standard as of 2024)
  const hash = await bcrypt.hash(req.body.password, 12);
  req.body.password_hash = hash;
  // Delete plaintext password to prevent it from being stored in the database
  delete req.body.password;

  const { data } = await supabase
    .from("users")
    .insert(req.body)
    .select()
    .single();
  res.json(data);
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
