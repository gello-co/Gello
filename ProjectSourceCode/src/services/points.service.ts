import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPointsHistory,
  getLeaderboard,
  getPointsHistoryByUser,
  getUserPoints,
  type LeaderboardEntry,
  type PointsHistory,
} from "../db/points.db.js";
import { getTaskById } from "../db/tasks.db.js";
import { getUserById } from "../db/users.db.js";
import { ResourceNotFoundError } from "../errors/ResourceNotFoundError.js";
import type { ManualAwardInput } from "../schemas/points.js";
import { calculateTaskPoints, validateManualAward } from "../utils/points.js";

export class PointsService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient, _currentUserId?: string) {
    this.client = client;
  }

  // Award points for completing a task
  async awardPointsForTaskCompletion(
    taskId: string,
    userId: string
  ): Promise<PointsHistory> {
    const task = await getTaskById(this.client, taskId);
    if (!task) {
      throw new ResourceNotFoundError("Task not found");
    }

    if (task.completed_at) {
      throw new Error("Task already completed");
    }

    const points = calculateTaskPoints(task.story_points);

    return createPointsHistory(this.client, {
      user_id: userId,
      points_earned: points,
      reason: "task_complete",
      task_id: taskId,
      awarded_by: userId,
    });
  }

  // Manually award points to a user
  async awardManualPoints(
    input: ManualAwardInput,
    awardedBy: string
  ): Promise<PointsHistory> {
    if (!validateManualAward(input.points_earned)) {
      throw new Error("Invalid points amount");
    }

    const user = await getUserById(this.client, input.user_id);
    if (!user) {
      throw new ResourceNotFoundError("User not found");
    }

    return createPointsHistory(this.client, {
      user_id: input.user_id,
      points_earned: input.points_earned,
      reason: "manual_award",
      awarded_by: awardedBy,
      notes: input.notes ?? null,
    });
  }

  // Deduct points from a user
  async deductPoints(
    userId: string,
    points: number,
    deductedBy: string,
    notes?: string
  ): Promise<PointsHistory> {
    if (points <= 0) {
      throw new Error("Points to deduct must be greater than 0");
    }

    const user = await getUserById(this.client, userId);
    if (!user) {
      throw new ResourceNotFoundError("User not found");
    }

    return createPointsHistory(this.client, {
      user_id: userId,
      points_earned: -points, // Negative points for deduction
      reason: "manual_deduction",
      awarded_by: deductedBy,
      notes: notes ?? null,
    });
  }

  // Get points history for a user
  async getPointsHistory(userId: string): Promise<PointsHistory[]> {
    return getPointsHistoryByUser(this.client, userId);
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return getLeaderboard(this.client, limit);
  }

  // Get total points for a user
  async getUserPoints(userId: string): Promise<number> {
    return getUserPoints(this.client, userId);
  }
}
