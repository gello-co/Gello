import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pointsDb from '../../../ProjectSourceCode/src/lib/database/points.db.js';
import * as tasksDb from '../../../ProjectSourceCode/src/lib/database/tasks.db.js';
import * as usersDb from '../../../ProjectSourceCode/src/lib/database/users.db.js';
import type {
  LeaderboardEntry,
  PointsHistory,
} from '../../../ProjectSourceCode/src/lib/schemas/points.js';
import { PointsService } from '../../../ProjectSourceCode/src/lib/services/points.service.js';
import * as pointsUtils from '../../../ProjectSourceCode/src/lib/utils/points.js';
import { mockFn } from '../../setup/helpers/mock.js';

vi.mock('../../../ProjectSourceCode/src/lib/database/tasks.db.js', () => ({
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock('../../../ProjectSourceCode/src/lib/database/users.db.js', () => ({
  getUserById: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('../../../ProjectSourceCode/src/lib/database/points.db.js', () => ({
  createPointsHistory: vi.fn(),
  getPointsHistoryByUser: vi.fn(),
  getLeaderboard: vi.fn(),
  getUserPoints: vi.fn(),
}));
vi.mock('../../../ProjectSourceCode/src/lib/utils/points.js', () => ({
  calculateTaskPoints: vi.fn(),
  validateManualAward: vi.fn(),
}));

const createMockPointsHistory = (overrides: Partial<PointsHistory> = {}): PointsHistory => ({
  id: 'points-1',
  user_id: 'user-1',
  points_earned: 10,
  reason: 'manual_award',
  task_id: null,
  awarded_by: 'admin-id',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockLeaderboardEntry = (
  overrides: Partial<LeaderboardEntry> = {}
): LeaderboardEntry => ({
  user_id: 'user-1',
  display_name: 'Test User',
  email: 'user@example.com',
  avatar_url: null,
  total_points: 10,
  rank: 1,
  ...overrides,
});

describe('PointsService', () => {
  let service: PointsService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new PointsService(mockClient, 'current-user-id');
  });

  describe('awardPointsForTaskCompletion', () => {
    it('should award points for task completion', async () => {
      const mockTask = {
        id: 'task-1',
        story_points: 5,
        completed_at: null,
      };
      const mockPointsHistory = createMockPointsHistory({
        points_earned: 5,
        reason: 'task_complete',
        task_id: 'task-1',
        awarded_by: 'user-1',
      });

      mockFn(tasksDb.getTaskById).mockResolvedValue(mockTask as any);
      mockFn(pointsUtils.calculateTaskPoints).mockReturnValue(5);
      mockFn(pointsDb.createPointsHistory).mockResolvedValue(mockPointsHistory as any);

      const result = await service.awardPointsForTaskCompletion('task-1', 'user-1');

      expect(tasksDb.getTaskById).toHaveBeenCalledWith(mockClient, 'task-1');
      expect(pointsUtils.calculateTaskPoints).toHaveBeenCalledWith(5);
      expect(pointsDb.createPointsHistory).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-1',
        points_earned: 5,
        reason: 'task_complete',
        task_id: 'task-1',
        awarded_by: 'user-1',
      });
      expect(result).toEqual(mockPointsHistory);
    });

    it('should throw error if task not found', async () => {
      mockFn(tasksDb.getTaskById).mockResolvedValue(null);

      await expect(service.awardPointsForTaskCompletion('task-1', 'user-1')).rejects.toThrow(
        'Task not found'
      );
    });

    it('should throw error if task already completed', async () => {
      const mockTask = {
        id: 'task-1',
        story_points: 5,
        completed_at: '2024-01-01T00:00:00Z',
      };

      mockFn(tasksDb.getTaskById).mockResolvedValue(mockTask as any);

      await expect(service.awardPointsForTaskCompletion('task-1', 'user-1')).rejects.toThrow(
        'Task already completed'
      );
    });
  });

  describe('awardManualPoints', () => {
    it('should award manual points', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };
      const mockPointsHistory = createMockPointsHistory();

      mockFn(pointsUtils.validateManualAward).mockReturnValue(true);
      mockFn(usersDb.getUserById).mockResolvedValue(mockUser as any);
      mockFn(pointsDb.createPointsHistory).mockResolvedValue(mockPointsHistory as any);

      const result = await service.awardManualPoints(
        { user_id: 'user-1', points_earned: 10, notes: null },
        'admin-id'
      );

      expect(pointsUtils.validateManualAward).toHaveBeenCalledWith(10);
      expect(usersDb.getUserById).toHaveBeenCalledWith(mockClient, 'user-1');
      expect(pointsDb.createPointsHistory).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-1',
        points_earned: 10,
        reason: 'manual_award',
        awarded_by: 'admin-id',
        notes: null,
      });
      expect(result).toEqual(mockPointsHistory);
    });

    it('should throw error for invalid points amount', async () => {
      mockFn(pointsUtils.validateManualAward).mockReturnValue(false);

      await expect(
        service.awardManualPoints({ user_id: 'user-1', points_earned: -5, notes: null }, 'admin-id')
      ).rejects.toThrow('Invalid points amount');
    });

    it('should throw error if user not found', async () => {
      mockFn(pointsUtils.validateManualAward).mockReturnValue(true);
      mockFn(usersDb.getUserById).mockResolvedValue(null);

      await expect(
        service.awardManualPoints({ user_id: 'user-1', points_earned: 10, notes: null }, 'admin-id')
      ).rejects.toThrow('User not found');
    });

    it('should include notes when provided', async () => {
      const mockUser = { id: 'user-1' };
      const mockPointsHistory = createMockPointsHistory({ id: 'points-1' });

      mockFn(pointsUtils.validateManualAward).mockReturnValue(true);
      mockFn(usersDb.getUserById).mockResolvedValue(mockUser as any);
      mockFn(pointsDb.createPointsHistory).mockResolvedValue(mockPointsHistory as any);

      await service.awardManualPoints(
        { user_id: 'user-1', points_earned: 10, notes: 'Great work!' },
        'admin-id'
      );

      expect(pointsDb.createPointsHistory).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-1',
        points_earned: 10,
        reason: 'manual_award',
        awarded_by: 'admin-id',
        notes: 'Great work!',
      });
    });
  });

  describe('getPointsHistory', () => {
    it('should return points history for user', async () => {
      const mockHistory = [createMockPointsHistory({ id: 'points-1', points_earned: 5 })];

      mockFn(pointsDb.getPointsHistoryByUser).mockResolvedValue(mockHistory as any);

      const result = await service.getPointsHistory('user-1');

      expect(pointsDb.getPointsHistoryByUser).toHaveBeenCalledWith(mockClient, 'user-1');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with default limit', async () => {
      const mockLeaderboard = [createMockLeaderboardEntry({ total_points: 100 })];

      mockFn(pointsDb.getLeaderboard).mockResolvedValue(mockLeaderboard as any);

      const result = await service.getLeaderboard();

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 100);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return leaderboard with custom limit', async () => {
      const mockLeaderboard = [createMockLeaderboardEntry({ total_points: 100 })];

      mockFn(pointsDb.getLeaderboard).mockResolvedValue(mockLeaderboard as any);

      const result = await service.getLeaderboard(50);

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 50);
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('getUserPoints', () => {
    it('should return user points', async () => {
      mockFn(pointsDb.getUserPoints).mockResolvedValue(150);

      const result = await service.getUserPoints('user-1');

      expect(pointsDb.getUserPoints).toHaveBeenCalledWith(mockClient, 'user-1');
      expect(result).toBe(150);
    });
  });
});
