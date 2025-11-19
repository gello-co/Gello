import { z } from "zod";

export const boardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullish(),
  team_id: z.uuid(),
  created_by: z.uuid().nullish(),
  created_at: z.string(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  team_id: z.uuid(),
  created_by: z.uuid().nullish(),
});

export const updateBoardBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  team_id: z.uuid().optional(),
});

export const updateBoardSchema = updateBoardBodySchema.extend({
  id: z.string().uuid(),
});

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
