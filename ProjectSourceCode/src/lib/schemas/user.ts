import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "manager", "member"]);

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  password_hash: z.string(),
  display_name: z.string().min(1),
  role: userRoleSchema,
  team_id: z.uuid().nullable(),
  total_points: z.number().int().min(0),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
});

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
  role: userRoleSchema.optional(),
  team_id: z.uuid().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
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
