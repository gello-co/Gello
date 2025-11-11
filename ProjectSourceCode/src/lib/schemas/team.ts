import { z } from "zod";

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  created_at: z.string(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1),
});

export const updateTeamSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
});

export type Team = z.infer<typeof teamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
