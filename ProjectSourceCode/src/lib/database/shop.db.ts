import type { SupabaseClient } from '@supabase/supabase-js';

export type ShopItem = {
  id: string;
  name: string;
  description: string | null;
  point_cost: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Redemption = {
  id: string;
  user_id: string;
  shop_item_id: string;
  points_spent: number;
  redeemed_at: string;
};

export type RedemptionWithItem = Redemption & {
  shop_item: Pick<ShopItem, 'name' | 'category' | 'image_url'>;
};

export async function getActiveShopItems(client: SupabaseClient): Promise<Array<ShopItem>> {
  const { data, error } = await client
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('point_cost', { ascending: true });

  if (error) {
    throw new Error(`Failed to get shop items: ${error.message}`);
  }

  return (data ?? []) as Array<ShopItem>;
}

export async function getShopItemById(
  client: SupabaseClient,
  id: string
): Promise<ShopItem | null> {
  const { data, error } = await client.from('shop_items').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get shop item: ${error.message}`);
  }

  return data as ShopItem;
}

export async function createRedemption(
  client: SupabaseClient,
  input: { user_id: string; shop_item_id: string; points_spent: number }
): Promise<Redemption> {
  const { data, error } = await client
    .from('redemptions')
    .insert({
      user_id: input.user_id,
      shop_item_id: input.shop_item_id,
      points_spent: input.points_spent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create redemption: ${error.message}`);
  }

  return data as Redemption;
}

export async function getUserRedemptions(
  client: SupabaseClient,
  userId: string
): Promise<Array<RedemptionWithItem>> {
  const { data, error } = await client
    .from('redemptions')
    .select(
      `
      *,
      shop_item:shop_items(name, category, image_url)
    `
    )
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user redemptions: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    ...r,
    shop_item: r.shop_item as Pick<ShopItem, 'name' | 'category' | 'image_url'>,
  })) as Array<RedemptionWithItem>;
}
