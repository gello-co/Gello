/**
 * Calculate points earned from completing a task based on story points.
 * Story points are converted 1:1 to points.
 *
 * @param storyPoints - The story points value of the task (must be >= 0)
 * @returns The points earned
 * @throws Error if storyPoints is negative, null, or undefined
 */
export function calculateTaskPoints(storyPoints: number): number {
  if (storyPoints === null || storyPoints === undefined) {
    throw new Error("Story points cannot be null or undefined");
  }
  if (storyPoints < 0) {
    throw new Error("Story points cannot be negative");
  }
  return storyPoints;
}

/**
 * Validate a manual point award from an admin.
 *
 * @param points - The points to award (must be > 0)
 * @returns true if valid, false otherwise
 */
export function validateManualAward(points: number): boolean {
  if (points === null || points === undefined) {
    return false;
  }
  if (!Number.isFinite(points)) {
    return false;
  }
  return points > 0;
}
