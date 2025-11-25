/**
 * Ports Index - Export all service interfaces
 *
 * These interfaces define the contracts that adapters must implement.
 * Routes and views depend only on these interfaces, enabling:
 * - Mock implementations for UI development
 * - Real implementations for production
 * - Easy testing with stub data
 */

export type { IAuthService } from "./auth.port.js";
export type { IBoardService } from "./board.port.js";
export type { ITaskService } from "./task.port.js";
export type { ITeamService } from "./team.port.js";
export type { IUserService } from "./user.port.js";
