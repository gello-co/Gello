/**
 * Permission utility functions
 * Pure functions for role-based permission checks
 */

export type UserRole = "admin" | "manager" | "member";

/**
 * Check if role is admin
 */
export function isAdmin(role: UserRole | string): boolean {
  return role === "admin";
}

/**
 * Check if role is manager
 */
export function isManager(role: UserRole | string): boolean {
  return role === "manager";
}

/**
 * Check if role is member
 */
export function isMember(role: UserRole | string): boolean {
  return role === "member";
}

/**
 * Check if role can manage teams (admin or manager)
 */
export function canManageTeam(role: UserRole | string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if role can manage boards (admin or manager)
 */
export function canManageBoard(role: UserRole | string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if role can manage lists (admin or manager)
 */
export function canManageList(role: UserRole | string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if role can manage tasks (admin or manager)
 */
export function canManageTask(role: UserRole | string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if role can view all users (admin only)
 */
export function canViewAllUsers(role: UserRole | string): boolean {
  return role === "admin";
}

/**
 * Check if role can manage users (admin only)
 */
export function canManageUsers(role: UserRole | string): boolean {
  return role === "admin";
}
