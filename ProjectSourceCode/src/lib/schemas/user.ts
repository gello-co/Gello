import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { users } from "../database/schema/users.js";

/**
 * Base schemas generated from Drizzle ORM schema using drizzle-zod
 * These ensure type safety and alignment with the database schema
 * Reference: https://orm.drizzle.team/docs/zod
 *
 * These use camelCase field names matching the Drizzle schema.
 * API schemas below use snake_case for API contract compatibility.
 */
export const userInsertSchemaBase = createInsertSchema(users, {
  email: (_schema) => z.email(),
  displayName: (schema) => schema.min(1),
  totalPoints: (schema) => schema.min(0),
});

export const userUpdateSchemaBase = createUpdateSchema(users, {
  email: () => z.email(),
  displayName: (schema) => schema.min(1),
  totalPoints: (schema) => schema.min(0),
});

export const userSelectSchemaBase = createSelectSchema(users);

// Generate enum schema from Drizzle enum
export const userRoleSchema = z.enum(["admin", "manager", "member"]);

/**
 * API schemas using snake_case for API contract compatibility
 * These maintain the existing API format while leveraging Drizzle-generated schemas
 * for type safety and validation alignment.
 */

// Select schema - for API responses (snake_case format)
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  password_hash: z.string(),
  display_name: z.string().min(1),
  role: userRoleSchema,
  team_id: z.uuid().nullable(),
  total_points: z.number().int().min(0),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
});

export const createUserSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    display_name: z.string().min(1),
    role: userRoleSchema.optional(),
    team_id: z.uuid().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    total_points: z.number().int().min(0).optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  })
  .transform((data) => {
    // Remove passwordConfirm before passing to service
    const { passwordConfirm: _passwordConfirm, ...rest } = data;
    return rest;
  });

export const updateUserSchema = z.object({
  id: z.uuid(),
  email: z.email().optional(),
  display_name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  team_id: z.uuid().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
