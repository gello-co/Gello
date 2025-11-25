import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { boards } from "../database/schema/boards.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const boardInsertSchemaBase = createInsertSchema(boards, {
  name: (schema) => schema.min(1, "Name required").max(100, "Name too long"),
  description: (schema) => schema.max(500, "Description too long"),
});

export const boardUpdateSchemaBase = createUpdateSchema(boards, {
  name: (schema) => schema.min(1, "Name required").max(100, "Name too long"),
  description: (schema) => schema.max(500, "Description too long"),
});

export const boardSelectSchemaBase = createSelectSchema(boards);

/**
 * API schemas using snake_case for API contract compatibility
 * These maintain the existing API format while leveraging Drizzle-generated schemas
 * for type safety and validation alignment.
 */

// Select schema - for API responses (snake_case format)
export const boardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullish(),
  team_id: z.uuid(),
  created_by: z.uuid().nullish(),
  created_at: z.string(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1, "Name required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  team_id: z.uuid("Invalid team ID"),
  created_by: z.uuid("Invalid user ID").optional(),
});

// Update schema - validation rules aligned with Drizzle schema via boardUpdateSchemaBase
export const updateBoardBodySchema = z.object({
  name: z.string().min(1, "Name required").max(100, "Name too long").optional(),
  description: z.string().max(500, "Description too long").optional(),
  team_id: z.uuid("Invalid team ID").optional(),
});

export const updateBoardSchema = updateBoardBodySchema.extend({
  id: z.uuid(),
});

export const boardIdSchema = z.object({
  id: z.uuid("Invalid board ID"),
});

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
