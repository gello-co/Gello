import type { SupabaseClient } from '@supabase/supabase-js';
import { createPointsHistory, getUserPoints } from '../database/points.db.js';
import {
  createRedemption,
  getActiveShopItems,
  getShopItemById,
  getUserRedemptions,
  type Redemption,
  type RedemptionWithItem,
  type ShopItem,
} from '../database/shop.db.js';
import { InsufficientPointsError, ResourceNotFoundError } from '../errors/app.errors.js';

export class ShopService {
  constructor(private client: SupabaseClient) {}

  async getAvailableItems(): Promise<Array<ShopItem>> {
    return getActiveShopItems(this.client);
  }

  async getItemById(id: string): Promise<ShopItem | null> {
    return getShopItemById(this.client, id);
  }

  async redeemItem(userId: string, itemId: string): Promise<Redemption> {
    const item = await getShopItemById(this.client, itemId);

    if (!item) {
      throw new ResourceNotFoundError('Item not found');
    }

    if (!item.is_active) {
      throw new Error('Item is not available');
    }

    const userPoints = await getUserPoints(this.client, userId);

    if (userPoints < item.point_cost) {
      throw new InsufficientPointsError('Insufficient points');
    }

    await createPointsHistory(this.client, {
      user_id: userId,
      points_earned: -item.point_cost,
      reason: 'redemption',
      notes: `Redeemed: ${item.name}`,
    });

    return createRedemption(this.client, {
      user_id: userId,
      shop_item_id: itemId,
      points_spent: item.point_cost,
    });
  }

  async getUserRedemptions(userId: string): Promise<Array<RedemptionWithItem>> {
    return getUserRedemptions(this.client, userId);
  }
}
