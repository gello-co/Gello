import { z } from "zod";

/**
 * Task schemas using pure Zod
 * API uses snake_case field names
 */

export const taskSchema = z.object({
  id: z.uuid(),
  list_id: z.uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  story_points: z.number().int().min(1).max(100),
  assigned_to: z.uuid().nullable(),
  position: z.number().int().min(0),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});

export const createTaskBodySchema = z.object({
  title: z.string().min(1, "Title required").max(200, "Title too long"),
  description: z
    .string()
    .max(1000, "Description too long")
    .nullable()
    .optional(),
  story_points: z.number().int().min(1).max(100).optional().default(1),
  assigned_to: z.uuid().nullable().optional(),
  position: z.number().int().min(0).optional().default(0),
  due_date: z.string().nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title required").max(200, "Title too long"),
  description: z
    .string()
    .max(1000, "Description too long")
    .nullable()
    .optional(),
  list_id: z.uuid("Invalid list ID"),
  story_points: z.number().int().min(1).max(100).optional().default(1),
  assigned_to: z.uuid().nullable().optional(),
  position: z.number().int().min(0).optional().default(0),
  due_date: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  list_id: z.uuid("Invalid list ID").optional(),
  title: z
    .string()
    .min(1, "Title required")
    .max(200, "Title too long")
    .optional(),
  description: z
    .string()
    .max(1000, "Description too long")
    .nullable()
    .optional(),
  story_points: z.number().int().min(1).max(100).optional(),
  assigned_to: z.uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  due_date: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const moveTaskSchema = z.object({
  list_id: z.uuid(),
  position: z.number().int().min(0),
});

export const assignTaskSchema = z.object({
  assigned_to: z.uuid().nullable(),
});

export const taskIdSchema = z.object({
  id: z.uuid("Invalid task ID"),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskBodyInput = z.infer<typeof createTaskBodySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
