import type { SupabaseClient } from '@supabase/supabase-js';
import { ResourceNotFoundError } from '../errors/app.errors.js';
import { logger } from '../logger.js';
import type {
  AssignTaskInput,
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from '../schemas/task.js';

export type Task = {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  story_points: number;
  assigned_to: string | null;
  position: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export class TaskService {
  constructor(private supabase: SupabaseClient) {}

  async getTask(id: string): Promise<Task | null> {
    try {
      const { data, error } = await this.supabase.from('tasks').select('*').eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get task by ID');
      throw error;
    }
  }

  async getTasksByList(listId: string): Promise<Array<Task>> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error, listId }, 'Failed to get tasks by list');
      throw error;
    }
  }

  async getTasksByAssignee(userId: string): Promise<Array<Task>> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get tasks by assignee');
      throw error;
    }
  }

  async createTask(input: CreateTaskInput & { list_id: string }): Promise<Task> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert({
          list_id: input.list_id,
          title: input.title,
          description: input.description ?? null,
          story_points: input.story_points ?? 1,
          assigned_to: input.assigned_to ?? null,
          position: input.position ?? 0,
          due_date: input.due_date ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Failed to create task: No data returned');
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create task');
      throw error;
    }
  }

  async updateTask(input: UpdateTaskInput & { id: string }): Promise<Task> {
    try {
      const { id, ...updates } = input;

      const updateData: Record<string, string | number | boolean | null> = {};

      if (updates.list_id !== undefined) updateData.list_id = updates.list_id;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.story_points !== undefined) updateData.story_points = updates.story_points;
      if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      if (updates.completed_at !== undefined) updateData.completed_at = updates.completed_at;

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ResourceNotFoundError(`Task not found: ${id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`Task not found: ${id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, 'Failed to update task');
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async moveTask(input: MoveTaskInput & { id: string }): Promise<Task> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update({
          list_id: input.list_id,
          position: input.position,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ResourceNotFoundError(`Task not found: ${input.id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`Task not found: ${input.id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, 'Failed to move task');
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async assignTask(input: AssignTaskInput & { id: string }): Promise<Task> {
    // Validate that the assigned user exists if assigned_to is provided
    if (input.assigned_to) {
      try {
        const { data: user, error } = await this.supabase
          .from('users')
          .select('id')
          .eq('id', input.assigned_to)
          .single();

        if (error || !user) {
          throw new ResourceNotFoundError('Assignee not found');
        }
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          throw error;
        }
        logger.error({ error, assigned_to: input.assigned_to }, 'Failed to validate assignee');
        throw new Error('Database error while validating assignee');
      }
    }

    return this.updateTask({
      id: input.id,
      assigned_to: input.assigned_to,
    });
  }

  async completeTask(id: string): Promise<Task> {
    try {
      // First, get the task to check if it's already completed
      const existingTask = await this.getTask(id);
      if (!existingTask) {
        throw new ResourceNotFoundError(`Task not found: ${id}`);
      }

      // If already completed, return the existing task (idempotent)
      if (existingTask.completed_at) {
        return existingTask;
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ResourceNotFoundError(`Task not found: ${id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`Task not found: ${id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, id }, 'Failed to complete task');
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('tasks').delete().eq('id', id).select().single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ResourceNotFoundError(`Task not found: ${id}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete task');
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }
}
