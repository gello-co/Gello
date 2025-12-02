import { z } from "zod";

export const itemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  points: z.number(),
  image_url: z.string().url().optional(),
});

export const createItemSchema = z.object({
  name: z.string(),
  points: z.number(),
  image_url: z.string().url().optional(),
});

export const updateItemSchema = z.object({
  // id comes from URL parameter, not request body
  id: z.uuid(),
  name: z.string().optional(),
  points: z.number().optional(),
  image_url: z.string().url().optional(),
});

export const userItemAssociationSchema = z.object({
  user_id: z.uuid(),
  item_id: z.uuid(),
});

export const createUserItemAssociationSchema = z.object({
  user_id: z.uuid(),
  item_id: z.uuid(),
});

export type Item = z.infer<typeof itemSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UserItemAssociation = z.infer<typeof userItemAssociationSchema>;
