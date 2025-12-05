
//TODO: Refactor to use TaskService methods and validation instead of direct Supabase calls
import express from "express";
import type { Request, Response } from "express";
import { TaskService } from "../services/task.service.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const router = express.Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("tasks").select("*");
  res.json(data);
});

router.get("/all", requireAuth,  async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
  res.json(data);
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .insert(req.body)
    .select()
    .single();
  res.json(data);
});

router.put("/:id",requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();
  res.json(data);
});

router.put("/:id/assign", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .update({ assigned_to: req.body.assigned_to})
    .eq("id", req.params.id)
    .select()
    .single();
  res.json(data);
});

router.put("/:id/complete", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .update({ completed: true })
    .eq("id", req.params.id)
    .select()
    .single();
  res.json(data);
});


router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  await supabase.from("tasks").delete().eq("id", req.params.id);
  res.json({ ok: true });
});


export default router;