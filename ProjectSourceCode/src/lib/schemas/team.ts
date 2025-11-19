import { z } from "zod";

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  created_at: z.date(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateTeamBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

export const updateTeamSchema = updateTeamBodySchema.extend({
  id: z.string().uuid(),
});

export type Team = z.infer<typeof teamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
