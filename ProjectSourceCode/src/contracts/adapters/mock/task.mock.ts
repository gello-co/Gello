/**
 * Mock Task Adapter - In-memory task data for UI development
 */

import { getMockTasksByList, MOCK_TASKS } from "../../fixtures/index.js";
import type { ITaskService } from "../../ports/task.port.js";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "../../types/index.js";

export class MockTaskService implements ITaskService {
  private tasks: Map<string, Task> = new Map(
    MOCK_TASKS.map((t) => [t.id, { ...t }]),
  );

  async getById(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async getByList(listId: string): Promise<Task[]> {
    const results: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.list_id === listId) results.push(task);
    }
    if (results.length === 0) {
      return getMockTasksByList(listId);
    }
    return results.sort((a, b) => a.position - b.position);
  }

  async getByAssignee(userId: string): Promise<Task[]> {
    const results: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.assigned_to === userId) results.push(task);
    }
    return results.sort((a, b) => a.position - b.position);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    // Calculate next position in list
    const listTasks = await this.getByList(input.list_id);
    const maxPosition = listTasks.reduce(
      (max, t) => Math.max(max, t.position),
      -1,
    );

    const task: Task = {
      id: `task-mock-${Date.now()}`,
      list_id: input.list_id,
      title: input.title,
      description: input.description ?? null,
      assigned_to: input.assigned_to ?? null,
      story_points: input.story_points ?? 1,
      position: input.position ?? maxPosition + 1,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async update(input: UpdateTaskInput): Promise<Task> {
    const existing = this.tasks.get(input.id);
    if (!existing) {
      throw new Error(`Task not found: ${input.id}`);
    }

    const updated: Task = {
      ...existing,
      ...input,
    };
    this.tasks.set(input.id, updated);
    return updated;
  }

  async move(
    taskId: string,
    targetListId: string,
    position: number,
  ): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated: Task = {
      ...task,
      list_id: targetListId,
      position,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async complete(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated: Task = {
      ...task,
      completed_at: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.tasks.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }
    this.tasks.delete(id);
  }

  /**
   * Reset to fixture data (for tests)
   */
  reset(): void {
    this.tasks = new Map(MOCK_TASKS.map((t) => [t.id, { ...t }]));
  }
}

export function createMockTaskService(): MockTaskService {
  return new MockTaskService();
}
