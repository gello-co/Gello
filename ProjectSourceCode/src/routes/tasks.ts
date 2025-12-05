
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
  const tasks  = await supabase
    .from("tasks")
    .select("*");
  res.json(tasks.data);
});

router.get("/all", requireAuth,  async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();


  const { data } = await supabase
    .from("tasks")
    .select("*")
  res.json(data);

});

router.get("/assignedTasks/:id", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", id);
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error fetching user tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks for this user" });
  }
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

router.put("/assign/:id", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .update({ assigned_to: req.body.assigned_to})
    .eq("id", req.params.id)
    .select()
    .single();
  res.json(data);
});

router.put("/complete/:id", requireAuth, async (req: Request, res: Response) => {
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