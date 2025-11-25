import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { lists } from "../database/schema/lists.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const listInsertSchemaBase = createInsertSchema(lists, {
  name: (schema) => schema.min(1),
  position: (schema) => schema.min(0),
});

export const listUpdateSchemaBase = createUpdateSchema(lists, {
  name: (schema) => schema.min(1),
  position: (schema) => schema.min(0),
});

export const listSelectSchemaBase = createSelectSchema(lists);

/**
 * API schemas using snake_case for API contract compatibility
 * These maintain the existing API format while leveraging Drizzle-generated schemas
 * for type safety and validation alignment.
 */

// Select schema - for API responses (snake_case format)
export const listSchema = z.object({
  id: z.uuid(),
  board_id: z.uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  created_at: z.coerce.date(),
});

// Create body schema - board_id comes from URL parameter, not request body
// Used by validation middleware (validates req.body only)
export const createListBodySchema = z.object({
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

// Full create schema - includes board_id for service layer
// Used after merging body + URL params in route handler
export const createListSchema = z.object({
  board_id: z.string().uuid("Invalid board ID"),
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

// Update schema - all fields optional, id comes from URL parameter
// Validation rules aligned with Drizzle schema via listUpdateSchemaBase
export const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

export const listIdSchema = z.object({
  id: z.string().uuid("Invalid list ID"),
});

export const reorderListsSchema = z.object({
  board_id: z.uuid(),
  list_positions: z.array(
    z.object({
      id: z.uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export type List = z.infer<typeof listSchema>;
export type CreateListBodyInput = z.infer<typeof createListBodySchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
