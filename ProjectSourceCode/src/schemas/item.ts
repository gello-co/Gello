import { z } from "zod";

export const itemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  points: z.number(),
});

export const createItemSchema = z.object({
  name: z.string(),
  points: z.number(),
});

export const updateItemSchema = z.object({
  // id comes from URL parameter, not request body
  name: z.string().optional(),
  points: z.number().optional(),
});

export const userItemAssociationSchema = z.object({
  user_id: z.uuid(),
  item_id: z.uuid(),
});

export const createUserItemAssociationSchema = z.object({
  user_id: z.uuid(),
  item_id: z.uuid(),
});