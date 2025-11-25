import { beforeEach, describe, expect, it } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/database/drizzle";
import { boards, lists, tasks, teams } from "@/lib/database/schema";
import { TaskService } from "@/lib/services/task.service";

describe.skip("TaskService Integration (legacy)", () => {
  let service: TaskService;
  let testTeamId: string;
  let testBoardId: string;
  let testListId: string;

  beforeEach(async () => {
    const supabase = {} as SupabaseClient;
    service = new TaskService(supabase);

    // Cleanup
    await db.delete(tasks);
    await db.delete(lists);
    await db.delete(boards);
    await db.delete(teams);

    // Setup hierarchy
    const team = await db
      .insert(teams)
      .values({ name: "Test Team" })
      .returning();
    testTeamId = team[0]?.id ?? "";

    const board = await db
      .insert(boards)
      .values({
        name: "Test Board",
        teamId: testTeamId,
      })
      .returning();
    testBoardId = board[0]?.id ?? "";

    const list = await db
      .insert(lists)
      .values({
        name: "Test List",
        boardId: testBoardId,
        position: 0,
      })
      .returning();
    testListId = list[0]?.id ?? "";
  });

  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  it("should create and get a task", async () => {
    const input = {
      list_id: testListId,
      title: "Integration Task",
      story_points: 3,
      position: 0,
    };

    const created = await service.createTask(input);
    expect(created.id).toBeDefined();
    expect(created.title).toBe(input.title);
    expect(created.list_id).toBe(testListId);

    const fetched = await service.getTask(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.title).toBe(created.title);
    expect(fetched?.list_id).toBe(created.list_id);
  });

  it("should update a task", async () => {
    const created = await service.createTask({
      list_id: testListId,
      title: "Original Title",
      position: 0,
      story_points: 1,
    });

    const updated = await service.updateTask({
      id: created.id,
      title: "Updated Title",
      story_points: 5,
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.story_points).toBe(5);
    // Note: updated_at column removed in v0.2.0 schema simplification
  });

  it("should complete a task", async () => {
    const created = await service.createTask({
      list_id: testListId,
      title: "Task to Complete",
      position: 0,
      story_points: 1,
    });

    expect(created.completed_at).toBeNull();

    const completed = await service.completeTask(created.id);
    expect(completed.completed_at).not.toBeNull();

    // Verify in DB directly
    const inDb = await db.select().from(tasks).where(eq(tasks.id, created.id));
    expect(inDb[0]?.completedAt).not.toBeNull();
  });

  it("should delete a task", async () => {
    const created = await service.createTask({
      list_id: testListId,
      title: "Task to Delete",
      position: 0,
      story_points: 1,
    });

    await service.deleteTask(created.id);

    const fetched = await service.getTask(created.id);
    expect(fetched).toBeNull();
  });
});
