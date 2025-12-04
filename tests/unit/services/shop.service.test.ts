import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pointsDb from '../../../ProjectSourceCode/src/lib/database/points.db.js';
import type {
  Redemption,
  RedemptionWithItem,
  ShopItem,
} from '../../../ProjectSourceCode/src/lib/database/shop.db.js';
import * as shopDb from '../../../ProjectSourceCode/src/lib/database/shop.db.js';
import { ShopService } from '../../../ProjectSourceCode/src/lib/services/shop.service.js';
import { mockFn } from '../../setup/helpers/mock.js';

vi.mock('../../../ProjectSourceCode/src/lib/database/shop.db.js', () => ({
  getActiveShopItems: vi.fn(),
  getShopItemById: vi.fn(),
  createRedemption: vi.fn(),
  getUserRedemptions: vi.fn(),
}));
vi.mock('../../../ProjectSourceCode/src/lib/database/points.db.js', () => ({
  getUserPoints: vi.fn(),
  createPointsHistory: vi.fn(),
}));

const createMockShopItem = (overrides: Partial<ShopItem> = {}): ShopItem => ({
  id: 'item-1',
  name: 'Test Item',
  description: 'A test item',
  point_cost: 100,
  category: 'perk',
  image_url: '/images/test.svg',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockRedemption = (overrides: Partial<Redemption> = {}): Redemption => ({
  id: 'redemption-1',
  user_id: 'user-1',
  shop_item_id: 'item-1',
  points_spent: 100,
  redeemed_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockRedemptionWithItem = (
  overrides: Partial<RedemptionWithItem> = {}
): RedemptionWithItem => ({
  id: 'redemption-1',
  user_id: 'user-1',
  shop_item_id: 'item-1',
  points_spent: 100,
  redeemed_at: '2024-01-01T00:00:00Z',
  shop_item: {
    name: 'Test Item',
    category: 'perk',
    image_url: '/images/test.svg',
  },
  ...overrides,
});

describe('ShopService', () => {
  let service: ShopService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new ShopService(mockClient);
  });

  describe('getAvailableItems', () => {
    it('should return all active shop items', async () => {
      const mockItems = [
        createMockShopItem({ id: 'item-1', point_cost: 50 }),
        createMockShopItem({ id: 'item-2', point_cost: 100 }),
      ];

      mockFn(shopDb.getActiveShopItems).mockResolvedValue(mockItems);

      const result = await service.getAvailableItems();

      expect(shopDb.getActiveShopItems).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no items available', async () => {
      mockFn(shopDb.getActiveShopItems).mockResolvedValue([]);

      const result = await service.getAvailableItems();

      expect(result).toEqual([]);
    });
  });

  describe('getItemById', () => {
    it('should return item when found', async () => {
      const mockItem = createMockShopItem();

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);

      const result = await service.getItemById('item-1');

      expect(shopDb.getShopItemById).toHaveBeenCalledWith(mockClient, 'item-1');
      expect(result).toEqual(mockItem);
    });

    it('should return null when item not found', async () => {
      mockFn(shopDb.getShopItemById).mockResolvedValue(null);

      const result = await service.getItemById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('redeemItem', () => {
    it('should successfully redeem item when user has sufficient points', async () => {
      const mockItem = createMockShopItem({ point_cost: 100 });
      const mockRedemption = createMockRedemption();
      const mockPointsHistory = {
        id: 'points-1',
        user_id: 'user-1',
        points_earned: -100,
        reason: 'redemption',
        task_id: null,
        awarded_by: null,
        notes: 'Redeemed: Test Item',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);
      mockFn(pointsDb.getUserPoints).mockResolvedValue(150);
      mockFn(shopDb.createRedemption).mockResolvedValue(mockRedemption);
      mockFn(pointsDb.createPointsHistory).mockResolvedValue(mockPointsHistory as any);

      const result = await service.redeemItem('user-1', 'item-1');

      expect(shopDb.getShopItemById).toHaveBeenCalledWith(mockClient, 'item-1');
      expect(pointsDb.getUserPoints).toHaveBeenCalledWith(mockClient, 'user-1');
      expect(pointsDb.createPointsHistory).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-1',
        points_earned: -100,
        reason: 'redemption',
        notes: 'Redeemed: Test Item',
      });
      expect(shopDb.createRedemption).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-1',
        shop_item_id: 'item-1',
        points_spent: 100,
      });
      expect(result).toEqual(mockRedemption);
    });

    it('should throw error when item not found', async () => {
      mockFn(shopDb.getShopItemById).mockResolvedValue(null);

      await expect(service.redeemItem('user-1', 'item-1')).rejects.toThrow('Item not found');
    });

    it('should throw error when item is inactive', async () => {
      const mockItem = createMockShopItem({ is_active: false });

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);

      await expect(service.redeemItem('user-1', 'item-1')).rejects.toThrow('Item is not available');
    });

    it('should throw error when user has insufficient points', async () => {
      const mockItem = createMockShopItem({ point_cost: 100 });

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);
      mockFn(pointsDb.getUserPoints).mockResolvedValue(50);

      await expect(service.redeemItem('user-1', 'item-1')).rejects.toThrow('Insufficient points');
    });

    it('should throw error when user has exactly zero points', async () => {
      const mockItem = createMockShopItem({ point_cost: 100 });

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);
      mockFn(pointsDb.getUserPoints).mockResolvedValue(0);

      await expect(service.redeemItem('user-1', 'item-1')).rejects.toThrow('Insufficient points');
    });

    it('should allow redemption when user has exactly enough points', async () => {
      const mockItem = createMockShopItem({ point_cost: 100 });
      const mockRedemption = createMockRedemption();

      mockFn(shopDb.getShopItemById).mockResolvedValue(mockItem);
      mockFn(pointsDb.getUserPoints).mockResolvedValue(100);
      mockFn(shopDb.createRedemption).mockResolvedValue(mockRedemption);
      mockFn(pointsDb.createPointsHistory).mockResolvedValue({} as any);

      const result = await service.redeemItem('user-1', 'item-1');

      expect(result).toEqual(mockRedemption);
    });
  });

  describe('getUserRedemptions', () => {
    it('should return user redemptions with item details', async () => {
      const mockRedemptions = [
        createMockRedemptionWithItem({ id: 'redemption-1' }),
        createMockRedemptionWithItem({ id: 'redemption-2', points_spent: 50 }),
      ];

      mockFn(shopDb.getUserRedemptions).mockResolvedValue(mockRedemptions);

      const result = await service.getUserRedemptions('user-1');

      expect(shopDb.getUserRedemptions).toHaveBeenCalledWith(mockClient, 'user-1');
      expect(result).toEqual(mockRedemptions);
    });

    it('should return empty array when user has no redemptions', async () => {
      mockFn(shopDb.getUserRedemptions).mockResolvedValue([]);

      const result = await service.getUserRedemptions('user-1');

      expect(result).toEqual([]);
    });
  });
});
