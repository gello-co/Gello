import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  getTasksByAssignee,
  getTasksByList,
  getAllTasks,
  moveTask,
  type Task,
  updateTask,
} from "../db/tasks.db.js";
import { getUserById } from "../db/users.db.js";
import { ResourceNotFoundError } from "../errors/ResourceNotFoundError.js";
import type {
  AssignTaskInput,
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from "../schemas/task.js";

export class TaskService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getTask(id: string): Promise<Task | null> {
    return getTaskById(this.client, id);
  }

  async getTasksByList(listId: string): Promise<Task[]> {
    return getTasksByList(this.client, listId);
  }

  async getTasksByAssignee(userId: string): Promise<Task[]> {
    return getTasksByAssignee(this.client, userId);
  }

  async getAllTasks(): Promise<Task[]> {
    return getAllTasks(this.client);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    return createTask(this.client, input);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    return updateTask(this.client, input);
  }

  async moveTask(input: MoveTaskInput): Promise<Task> {
    return moveTask(this.client, input.id, input.list_id, input.position);
  }

  async assignTask(input: AssignTaskInput): Promise<Task> {
    // Validate that the assigned user exists if assigned_to is provided
    if (input.assigned_to) {
      const user = await getUserById(this.client, input.assigned_to);
      if (!user) {
        throw new ResourceNotFoundError("Assignee not found");
      }
    }

    return updateTask(this.client, {
      id: input.id,
      assigned_to: input.assigned_to,
    });
  }

  async completeTask(id: string): Promise<Task> {
    return completeTask(this.client, id);
  }

  async deleteTask(id: string): Promise<void> {
    return deleteTask(this.client, id);
  }
}
