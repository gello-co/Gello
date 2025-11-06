import { z } from "zod";

export const userSchema = z.object({
	id: z.string().uuid().optional(),
	username: z.string().min(3).max(50),
	email: z.string().email(),
	password: z.string().min(8),
	role: z.enum(["admin", "team"]),
	teamId: z.string().uuid().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export const loginSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
	teamId: z.string().uuid().optional(),
});

export type User = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
