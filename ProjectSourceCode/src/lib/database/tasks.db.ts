import type { SupabaseClient } from "@supabase/supabase-js";
import { ResourceNotFoundError } from "../errors/app.errors.js";

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

export type CreateTaskInput = {
  list_id: string;
  title: string;
  description?: string | null;
  story_points?: number;
  assigned_to?: string | null;
  position?: number;
  due_date?: string | null;
};

export type UpdateTaskInput = {
  id: string;
  list_id?: string;
  title?: string;
  description?: string | null;
  story_points?: number;
  assigned_to?: string | null;
  position?: number;
  due_date?: string | null;
  completed_at?: string | null;
};

export async function getTaskById(
  client: SupabaseClient,
  id: string,
): Promise<Task | null> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data as Task;
}

export async function getTasksByList(
  client: SupabaseClient,
  listId: string,
): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("list_id", listId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to get tasks by list: ${error.message}`);
  }

  return (data ?? []) as Task[];
}

export async function getTasksByAssignee(
  client: SupabaseClient,
  userId: string,
): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get tasks by assignee: ${error.message}`);
  }

  return (data ?? []) as Task[];
}

export async function createTask(
  client: SupabaseClient,
  input: CreateTaskInput,
): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
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

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data as Task;
}

export async function updateTask(
  client: SupabaseClient,
  input: UpdateTaskInput,
): Promise<Task> {
  const { id, ...updates } = input;

  const { data, error } = await client
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data as Task;
}

export async function moveTask(
  client: SupabaseClient,
  taskId: string,
  newListId: string,
  newPosition: number,
): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
    .update({
      list_id: newListId,
      position: newPosition,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to move task: ${error.message}`);
  }

  return data as Task;
}

export async function completeTask(
  client: SupabaseClient,
  taskId: string,
): Promise<Task> {
  // Call a Postgres function that sets completed_at using database timestamp
  const { data, error } = await client.rpc("complete_task_atomic", {
    p_task_id: taskId,
  });

  if (error) {
    // Check for specific error codes instead of fragile string matching
    // Postgres exceptions raised in RPC functions use SQLSTATE codes
    // P0001 is the default SQLSTATE for user-defined exceptions
    // We also check details field which may contain structured error information
    if (
      error.code === "P0001" ||
      error.details?.includes("task_not_found") ||
      (error.details && error.details.includes("Task not found"))
    ) {
      throw new ResourceNotFoundError(`Task not found: ${taskId}`);
    }
    throw new Error(`Failed to complete task: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to complete task: No data returned");
  }

  return data as Task;
}

export async function deleteTask(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}
