import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { tasks } from "../database/schema/tasks.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const taskInsertSchemaBase = createInsertSchema(tasks, {
  title: (schema) => schema.min(1, "Title required").max(200, "Title too long"),
  description: (schema) => schema.max(1000, "Description too long"),
  storyPoints: (schema) => schema.min(1).max(100),
  position: (schema) => schema.min(0),
});

export const taskUpdateSchemaBase = createUpdateSchema(tasks, {
  title: (schema) => schema.min(1, "Title required").max(200, "Title too long"),
  description: (schema) => schema.max(1000, "Description too long"),
  storyPoints: (schema) => schema.min(1).max(100),
  position: (schema) => schema.min(0),
});

export const taskSelectSchemaBase = createSelectSchema(tasks);

/**
 * API schemas using snake_case for API contract compatibility
 * These derive from the base schemas to ensure validation rules stay in sync.
 */

// Select schema - for API responses (snake_case format)
// Derived from taskSelectSchemaBase with date fields converted to strings
// Using type assertion for TypeScript compatibility with drizzle-zod
type ExtractShape<T> = T extends z.ZodObject<infer Shape> ? Shape : never;
const selectBase = (
  taskSelectSchemaBase as z.ZodObject<ExtractShape<typeof taskSelectSchemaBase>>
).shape;

// Transform date schemas to string format for API responses
// Uses Zod 4's transform method, properly handling nullable dates
const transformDateField = (
  dateSchema: z.ZodDate | z.ZodNullable<z.ZodDate>,
): z.ZodTypeAny => {
  // Check if schema is nullable using Zod v4 API
  const isNullable = "unwrap" in dateSchema;
  const baseDateSchema = isNullable
    ? (dateSchema as z.ZodNullable<z.ZodDate>).unwrap()
    : (dateSchema as z.ZodDate);

  // Transform Date to ISO string for API responses
  const stringSchema = baseDateSchema.transform((val: Date) =>
    val.toISOString(),
  );

  return isNullable ? stringSchema.nullable() : stringSchema;
};

export const taskSchema = z.object({
  id: selectBase.id,
  list_id: selectBase.listId,
  title: selectBase.title,
  description: selectBase.description,
  story_points: selectBase.storyPoints,
  assigned_to: selectBase.assignedTo,
  position: selectBase.position,
  due_date: transformDateField(
    selectBase.dueDate as z.ZodDate | z.ZodNullable<z.ZodDate>,
  ),
  completed_at: transformDateField(
    selectBase.completedAt as z.ZodDate | z.ZodNullable<z.ZodDate>,
  ),
  created_at: transformDateField(selectBase.createdAt as z.ZodDate),
});

// Create schema - list_id comes from URL parameter, not request body
// Derived from taskInsertSchemaBase to ensure validation rules stay in sync
// Using object destructuring for best TypeScript performance (Zod v4 recommendation)
// Reference: https://context7.com/websites/zod-v4/llms.txt
const insertBaseShape = (
  taskInsertSchemaBase as z.ZodObject<ExtractShape<typeof taskInsertSchemaBase>>
).shape;
// Body schema for validation middleware - list_id comes from URL param
export const createTaskBodySchema = z.object({
  title: insertBaseShape.title,
  description: insertBaseShape.description.nullable().optional(),
  story_points: insertBaseShape.storyPoints.optional().default(1),
  assigned_to: insertBaseShape.assignedTo.nullable().optional(),
  position: insertBaseShape.position.optional().default(0),
  due_date: z.iso.datetime().nullable().optional(),
});

// Full schema for service layer - includes list_id from URL param
export const createTaskSchema = z.object({
  title: insertBaseShape.title,
  description: insertBaseShape.description.nullable().optional(),
  list_id: z.string().uuid("Invalid list ID"),
  story_points: insertBaseShape.storyPoints.optional().default(1),
  assigned_to: insertBaseShape.assignedTo.nullable().optional(),
  position: insertBaseShape.position.optional().default(0),
  due_date: z.iso.datetime().nullable().optional(),
});

// Update schema - all fields optional, id comes from URL parameter
// Derived from taskUpdateSchemaBase to ensure validation rules stay in sync
const updateBaseShape = (
  taskUpdateSchemaBase as z.ZodObject<ExtractShape<typeof taskUpdateSchemaBase>>
).shape;
export const updateTaskSchema = z.object({
  list_id: z.uuid("Invalid list ID").optional(),
  // Reuse validation rules from base schema
  title: updateBaseShape.title.optional(),
  description: updateBaseShape.description.nullable().optional(),
  // API uses snake_case, map from camelCase
  story_points: updateBaseShape.storyPoints.optional(),
  assigned_to: updateBaseShape.assignedTo.nullable().optional(),
  position: updateBaseShape.position.optional(),
  due_date: z.iso.datetime().nullable().optional(),
  completed_at: z.iso.datetime().nullable().optional(),
});

export const moveTaskSchema = z.object({
  // id comes from URL parameter, not request body
  list_id: z.uuid(),
  position: z.number().int().min(0),
});

export const assignTaskSchema = z.object({
  // id comes from URL parameter, not request body
  assigned_to: z.uuid().nullable(),
});

export const taskIdSchema = z.object({
  id: z.string().uuid("Invalid task ID"),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskBodyInput = z.infer<typeof createTaskBodySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
