import { z } from "zod";

/**
 * Points schemas using pure Zod
 * API uses snake_case field names
 */

export const pointsReasonSchema = z.enum(["task_complete", "manual_award"]);

export const pointsHistorySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  points_earned: z.number().int().min(1),
  reason: pointsReasonSchema,
  task_id: z.uuid().nullable(),
  awarded_by: z.uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export const createPointsHistorySchema = z.object({
  user_id: z.uuid(),
  points_earned: z.number().int().min(1),
  reason: pointsReasonSchema,
  task_id: z.uuid().nullable().optional(),
  awarded_by: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const manualAwardSchema = z.object({
  points_earned: z.number().int().min(1),
  notes: z.string().nullable().optional(),
});

export const leaderboardEntrySchema = z.object({
  user_id: z.uuid(),
  display_name: z.string(),
  email: z.email(),
  avatar_url: z.string().nullable(),
  total_points: z.number().int().min(0),
  rank: z.number().int().min(1),
});

export type PointsReason = z.infer<typeof pointsReasonSchema>;
export type PointsHistory = z.infer<typeof pointsHistorySchema>;
export type CreatePointsHistoryInput = z.infer<
  typeof createPointsHistorySchema
>;
export type ManualAwardBody = z.infer<typeof manualAwardSchema>;
export type ManualAwardInput = ManualAwardBody & { user_id: string };
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
