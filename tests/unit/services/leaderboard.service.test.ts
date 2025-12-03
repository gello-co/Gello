import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../ProjectSourceCode/src/lib/database/points.db.js';
import * as pointsDb from '../../../ProjectSourceCode/src/lib/database/points.db.js';
import { LeaderboardService } from '../../../ProjectSourceCode/src/lib/services/leaderboard.service.js';
import { mockFn } from '../../setup/helpers/mock.js';

vi.mock('../../../ProjectSourceCode/src/lib/database/points.db.js', () => ({
  getLeaderboard: vi.fn(),
}));

const createMockLeaderboardEntry = (
  overrides: Partial<LeaderboardEntry> = {}
): LeaderboardEntry => ({
  user_id: 'user-1',
  display_name: 'User 1',
  email: 'user1@example.com',
  avatar_url: null,
  total_points: 100,
  rank: 1,
  ...overrides,
});

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new LeaderboardService(mockClient);
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard with default limit', async () => {
      const mockLeaderboard: Array<LeaderboardEntry> = [
        createMockLeaderboardEntry({ rank: 1 }),
        createMockLeaderboardEntry({
          user_id: 'user-2',
          display_name: 'User 2',
          total_points: 50,
          rank: 2,
          email: 'user2@example.com',
        }),
      ];

      mockFn(pointsDb.getLeaderboard).mockResolvedValue(mockLeaderboard as Array<LeaderboardEntry>);

      const result = await service.getLeaderboard();

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 10);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should get leaderboard with custom limit', async () => {
      const mockLeaderboard: Array<LeaderboardEntry> = [
        createMockLeaderboardEntry({ total_points: 100 }),
      ];

      mockFn(pointsDb.getLeaderboard).mockResolvedValue(mockLeaderboard as Array<LeaderboardEntry>);

      const result = await service.getLeaderboard(10);

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 10);
      expect(result).toEqual(mockLeaderboard);
    });
  });
});
