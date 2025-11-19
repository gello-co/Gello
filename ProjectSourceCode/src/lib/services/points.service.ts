import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPointsHistory,
  getLeaderboard,
  getPointsHistoryByUser,
  getUserPoints,
  type LeaderboardEntry,
  type PointsHistory,
} from "../database/points.db.js";
import { getTaskById } from "../database/tasks.db.js";
import { getUserById } from "../database/users.db.js";
import { ResourceNotFoundError } from "../errors/app.errors.js";
import type {
  CreatePointsHistoryInput,
  ManualAwardInput,
} from "../schemas/points.js";
import { calculateTaskPoints, validateManualAward } from "../utils/points.js";

export class PointsService {
  constructor(
    private client: SupabaseClient,
    private currentUserId?: string,
  ) {}

  async awardPointsForTaskCompletion(
    taskId: string,
    userId: string,
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

  async awardManualPoints(
    input: ManualAwardInput,
    awardedBy: string,
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

  async getPointsHistory(userId: string): Promise<PointsHistory[]> {
    return getPointsHistoryByUser(this.client, userId);
  }

  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return getLeaderboard(this.client, limit);
  }

  async getUserPoints(userId: string): Promise<number> {
    return getUserPoints(this.client, userId);
  }
}
