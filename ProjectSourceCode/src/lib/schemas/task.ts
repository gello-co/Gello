import { z } from "zod";

export const taskSchema = z.object({
  id: z.uuid(),
  list_id: z.uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  story_points: z.number().int().min(1),
  assigned_to: z.uuid().nullable(),
  position: z.number().int().min(0),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});

export const createTaskSchema = z.object({
  // list_id comes from URL parameter, not request body
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  story_points: z.number().int().min(1).optional(),
  assigned_to: z.uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  due_date: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  // id comes from URL parameter, not request body
  list_id: z.uuid().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  story_points: z.number().int().min(1).optional(),
  assigned_to: z.uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  due_date: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const moveTaskSchema = z.object({
  // id comes from URL parameter, not request body
  list_id: z.uuid(),
  position: z.number().int().min(0),
});

export const assignTaskSchema = z.object({
  // id comes from URL parameter, not request body
  assigned_to: z.uuid().nullable(),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
