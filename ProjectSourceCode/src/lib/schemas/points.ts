import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  pointsHistory,
  pointsReasonEnum,
} from "../database/schema/points_history.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const pointsHistoryInsertSchemaBase = createInsertSchema(pointsHistory, {
  pointsEarned: (schema) => schema.min(1),
});

export const pointsHistorySelectSchemaBase = createSelectSchema(pointsHistory);

// Generate enum schema from Drizzle enum using drizzle-zod
// Reference: https://orm.drizzle.team/docs/zod - createSelectSchema supports enums
export const pointsReasonSchema = createSelectSchema(pointsReasonEnum);

/**
 * API schemas using snake_case for API contract compatibility
 * These maintain the existing API format while leveraging Drizzle-generated schemas
 * for type safety and validation alignment.
 */
const pointsHistoryResponseCamelSchema = pointsHistorySelectSchemaBase.pick({
  id: true,
  userId: true,
  pointsEarned: true,
  reason: true,
  taskId: true,
  awardedBy: true,
  notes: true,
  createdAt: true,
});

const toApiPointsHistory = (
  entry: z.infer<typeof pointsHistoryResponseCamelSchema>,
) => ({
  id: entry.id,
  user_id: entry.userId,
  points_earned: entry.pointsEarned,
  reason: entry.reason,
  task_id: entry.taskId,
  awarded_by: entry.awardedBy,
  notes: entry.notes,
  created_at:
    entry.createdAt instanceof Date
      ? entry.createdAt.toISOString()
      : entry.createdAt,
});

// Select schema - for API responses (snake_case format)
export const pointsHistorySchema =
  pointsHistoryResponseCamelSchema.transform(toApiPointsHistory);

const createPointsHistoryCamelSchema = pointsHistoryInsertSchemaBase
  .pick({
    userId: true,
    pointsEarned: true,
    reason: true,
    taskId: true,
    awardedBy: true,
    notes: true,
  })
  .extend({
    taskId: pointsHistoryInsertSchemaBase.shape.taskId.optional(),
    awardedBy: pointsHistoryInsertSchemaBase.shape.awardedBy.optional(),
    notes: pointsHistoryInsertSchemaBase.shape.notes.optional(),
  });

const createPointsHistorySnakeBase = z.object({
  user_id: createPointsHistoryCamelSchema.shape.userId,
  points_earned: createPointsHistoryCamelSchema.shape.pointsEarned,
  reason: createPointsHistoryCamelSchema.shape.reason,
  task_id: createPointsHistoryCamelSchema.shape.taskId,
  awarded_by: createPointsHistoryCamelSchema.shape.awardedBy,
  notes: createPointsHistoryCamelSchema.shape.notes,
});

const fromApiCreatePointsHistory = (
  input: z.infer<typeof createPointsHistorySnakeBase>,
) => ({
  userId: input.user_id,
  pointsEarned: input.points_earned,
  reason: input.reason,
  taskId: input.task_id,
  awardedBy: input.awarded_by,
  notes: input.notes,
});

const toApiCreatePointsHistory = (
  input: z.infer<typeof createPointsHistoryCamelSchema>,
) => ({
  user_id: input.userId,
  points_earned: input.pointsEarned,
  reason: input.reason,
  task_id: input.taskId,
  awarded_by: input.awardedBy,
  notes: input.notes,
});

// Create schema - validation rules leveraged from camelCase base schema
export const createPointsHistorySchema = createPointsHistorySnakeBase
  .transform((input) =>
    createPointsHistoryCamelSchema.parse(fromApiCreatePointsHistory(input)),
  )
  .transform(toApiCreatePointsHistory);

const manualAwardCamelSchema = z.object({
  pointsEarned: createPointsHistoryCamelSchema.shape.pointsEarned,
  notes: createPointsHistoryCamelSchema.shape.notes.optional(),
});

const manualAwardSnakeBase = z.object({
  // user_id comes from URL parameter, not request body
  points_earned: manualAwardCamelSchema.shape.pointsEarned,
  notes: manualAwardCamelSchema.shape.notes,
});

export const manualAwardSchema = manualAwardSnakeBase
  .transform((input) =>
    manualAwardCamelSchema.parse({
      pointsEarned: input.points_earned,
      notes: input.notes,
    }),
  )
  .transform((input) => ({
    points_earned: input.pointsEarned,
    notes: input.notes,
  }));

export const leaderboardEntrySchema = z.object({
  user_id: z.uuid(),
  display_name: z.string(),
  email: z.email(),
  avatar_url: z.string().nullable(),
  total_points: z.number().int().min(0),
  rank: z.number().int().min(1),
});

export type PointsHistory = z.infer<typeof pointsHistorySchema>;
export type CreatePointsHistoryInput = z.infer<
  typeof createPointsHistorySchema
>;
export type ManualAwardBody = z.infer<typeof manualAwardSchema>;
export type ManualAwardInput = ManualAwardBody & { user_id: string };
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
