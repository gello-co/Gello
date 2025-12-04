import { z } from 'zod';

/**
 * Board schemas using pure Zod
 * API uses snake_case field names
 */

export const boardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullish(),
  team_id: z.uuid(),
  created_by: z.uuid().nullish(),
  created_at: z.string(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  team_id: z.uuid('Invalid team ID'),
  created_by: z.uuid('Invalid user ID').optional(),
});

export const updateBoardBodySchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  team_id: z.uuid('Invalid team ID').optional(),
});

export const updateBoardSchema = updateBoardBodySchema.extend({
  id: z.uuid(),
});

export const boardIdSchema = z.object({
  id: z.uuid('Invalid board ID'),
});

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
