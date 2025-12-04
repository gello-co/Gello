import { z } from 'zod';

/**
 * List schemas using pure Zod
 * API uses snake_case field names
 */

export const listSchema = z.object({
  id: z.uuid(),
  board_id: z.uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  created_at: z.coerce.date(),
});

export const createListBodySchema = z.object({
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export const createListSchema = z.object({
  board_id: z.string().uuid('Invalid board ID'),
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

export const listIdSchema = z.object({
  id: z.string().uuid('Invalid list ID'),
});

export const reorderListsSchema = z.object({
  board_id: z.uuid(),
  list_positions: z.array(
    z.object({
      id: z.uuid(),
      position: z.number().int().min(0),
    })
  ),
});

export type List = z.infer<typeof listSchema>;
export type CreateListBodyInput = z.infer<typeof createListBodySchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
