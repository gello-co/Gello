import type { SupabaseClient } from "@supabase/supabase-js";
import { ResourceNotFoundError } from "../errors/ResourceNotFoundError.js";

export type PointsReason = "task_complete" | "manual_award";

export type PointsHistory = {
  id: string;
  user_id: string;
  points_earned: number;
  reason: PointsReason;
  task_id: string | null;
  awarded_by: string | null;
  notes: string | null;
  created_at: string;
};

export type CreatePointsHistoryInput = {
  user_id: string;
  points_earned: number;
  reason: PointsReason;
  task_id?: string | null;
  awarded_by?: string | null;
  notes?: string | null;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  total_points: number;
  rank: number;
};

export async function createPointsHistory(
  client: SupabaseClient,
  input: CreatePointsHistoryInput,
): Promise<PointsHistory> {
  // Call a Postgres function that wraps these operations in a transaction
  const { data, error } = await client.rpc("create_points_history_atomic", {
    p_user_id: input.user_id,
    p_points_earned: input.points_earned,
    p_reason: input.reason,
    p_task_id: input.task_id ?? null,
    p_awarded_by: input.awarded_by ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) {
    // Map Postgres exception messages to appropriate error types
    if (error.message.includes("User not found")) {
      throw new ResourceNotFoundError(error.message);
    }
    throw new Error(`Failed to create points history: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create points history: No data returned");
  }

  return data as PointsHistory;
}

export async function getPointsHistoryByUser(
  client: SupabaseClient,
  userId: string,
): Promise<PointsHistory[]> {
  const { data, error } = await client
    .from("points_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get points history by user: ${error.message}`);
  }

  return (data ?? []) as PointsHistory[];
}

export async function getLeaderboard(
  client: SupabaseClient,
  limit: number = 100,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await client
    .from("users")
    .select("id, display_name, email, avatar_url, total_points")
    .eq("role", "member")
    .order("total_points", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get leaderboard: ${error.message}`);
  }

  return (data ?? []).map((user, index) => ({
    user_id: user.id,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    total_points: user.total_points,
    rank: index + 1,
  })) as LeaderboardEntry[];
}

export async function getUserPoints(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await client
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to get user points: ${error.message}`);
  }

  return (data?.total_points ?? 0) as number;
}
