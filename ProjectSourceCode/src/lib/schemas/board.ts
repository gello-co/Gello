import { z } from "zod";

export const boardSchema = z.object({
	id: z.uuid().optional(),
	title: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	ownerId: z.uuid(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export const createBoardSchema = boardSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const updateBoardSchema = boardSchema.partial().required({ id: true });

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
