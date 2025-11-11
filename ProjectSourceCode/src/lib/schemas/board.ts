import { z } from "zod";

export const boardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  team_id: z.uuid(),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  team_id: z.uuid(),
  created_by: z.uuid().nullable().optional(),
});

export const updateBoardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  team_id: z.uuid().optional(),
});

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
