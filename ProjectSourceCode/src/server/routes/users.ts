import express from "express";
import { getSupabaseClient } from "../../lib/supabase.js";
import { SupabaseAuthClient } from "@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.get("/",async (req,res)=>{
  const supabase = getSupabaseClient();
  const {data} = await supabase.from("users").select("*");
    res.json(data);
});

router.post("/", async (req, res) => {
  const supabase = getSupabaseClient();

  const hash = await bcrypt.hash(req.body.password);
  req.body.password_hash = hash;

  const { data } = await supabase.from("users").insert(req.body).select().single();
  res.json(data);
});

router.put("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("users").update(req.body).eq("id", req.params.id).select().single();
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const supabase = getSupabaseClient();
  await supabase.from("users").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

export default router;