import type { Request } from "express";

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				username: string;
				email: string;
				role: "admin" | "team_member";
			} | null;
		}
	}
}

export {};
