/**
 * Task Port - Interface contract for task services
 */

import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/index.js";

export interface ITaskService {
  /**
   * Get task by ID
   */
  getById(id: string): Promise<Task | null>;

  /**
   * Get all tasks in a list
   */
  getByList(listId: string): Promise<Task[]>;

  /**
   * Get all tasks assigned to a user
   */
  getByAssignee(userId: string): Promise<Task[]>;

  /**
   * Create a new task
   */
  create(input: CreateTaskInput): Promise<Task>;

  /**
   * Update task
   */
  update(input: UpdateTaskInput): Promise<Task>;

  /**
   * Move task to another list
   */
  move(taskId: string, targetListId: string, position: number): Promise<Task>;

  /**
   * Complete a task (sets completed_at, awards points)
   */
  complete(taskId: string): Promise<Task>;

  /**
   * Delete task
   */
  delete(id: string): Promise<void>;
}
