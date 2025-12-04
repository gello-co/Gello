import { z } from 'zod';

/**
 * Shop schemas using pure Zod
 * API uses snake_case field names
 */

export const shopItemSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  point_cost: z.number().int().min(1),
  category: z.string().min(1).max(50),
  image_url: z.string().max(500).nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export const redemptionSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  shop_item_id: z.uuid(),
  points_spent: z.number().int().min(1),
  redeemed_at: z.string(),
});

export const redeemItemSchema = z.object({
  item_id: z.uuid('Invalid item ID'),
});

export type ShopItem = z.infer<typeof shopItemSchema>;
export type Redemption = z.infer<typeof redemptionSchema>;
export type RedeemItemInput = z.infer<typeof redeemItemSchema>;
