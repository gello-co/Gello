import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { teams } from "../database/schema/teams.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const teamInsertSchemaBase = createInsertSchema(teams, {
  name: (schema) => schema.trim().min(1).max(100),
});

export const teamUpdateSchemaBase = createUpdateSchema(teams, {
  name: (schema) => schema.trim().min(1).max(100),
});

export const teamSelectSchemaBase = createSelectSchema(teams);

/**
 * API schemas using snake_case for API contract compatibility
 * These maintain the existing API format while leveraging Drizzle-generated schemas
 * for type safety and validation alignment.
 */

// Select schema - for API responses (snake_case format)
export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  created_at: z.date(),
});

// Create schema - validation rules aligned with Drizzle schema via teamInsertSchemaBase
export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

// Update schema - validation rules aligned with Drizzle schema via teamUpdateSchemaBase
export const updateTeamBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

export const updateTeamSchema = updateTeamBodySchema.extend({
  id: z.uuid(),
});

export type Team = z.infer<typeof teamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
