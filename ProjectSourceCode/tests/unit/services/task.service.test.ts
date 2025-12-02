import { beforeEach, describe, expect, it, vi } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as tasksDb from "../../../ProjectSourceCode/src/lib/database/tasks.db.js";
import * as usersDb from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { TaskService } from "../../../ProjectSourceCode/src/lib/services/task.service.js";
import { mockFn } from "../../setup/helpers/mock.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/tasks.db.js", () => ({
  getTaskById: vi.fn(),
  getTasksByList: vi.fn(),
  getTasksByAssignee: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTask: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock("../../../ProjectSourceCode/src/lib/database/users.db.js", () => ({
  getUserById: vi.fn(),
}));

describe("TaskService (bun)", () => {
  let service: TaskService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new TaskService(mockClient);
  });

  describe("getTask", () => {
    it("should get task by id", async () => {
      const mockTask = { id: "task-1", title: "Test Task" };
      mockFn(tasksDb.getTaskById).mockResolvedValue(mockTask as any);

      const result = await service.getTask("task-1");

      expect(tasksDb.getTaskById).toHaveBeenCalledWith(mockClient, "task-1");
      expect(result).toEqual(mockTask);
    });
  });

  describe("getTasksByList", () => {
    it("should get tasks by list", async () => {
      const mockTasks = [
        { id: "task-1", title: "Task 1" },
        { id: "task-2", title: "Task 2" },
      ];
      mockFn(tasksDb.getTasksByList).mockResolvedValue(mockTasks as any);

      const result = await service.getTasksByList("list-1");

      expect(tasksDb.getTasksByList).toHaveBeenCalledWith(mockClient, "list-1");
      expect(result).toEqual(mockTasks);
    });
  });

  describe("getTasksByAssignee", () => {
    it("should get tasks by assignee", async () => {
      const mockTasks = [
        { id: "task-1", title: "Task 1", assigned_to: "user-1" },
      ];
      mockFn(tasksDb.getTasksByAssignee).mockResolvedValue(mockTasks as any);

      const result = await service.getTasksByAssignee("user-1");

      expect(tasksDb.getTasksByAssignee).toHaveBeenCalledWith(
        mockClient,
        "user-1",
      );
      expect(result).toEqual(mockTasks);
    });
  });

  describe("createTask", () => {
    it("should create a task", async () => {
      const input = {
        list_id: "list-1",
        title: "New Task",
        story_points: 5,
      };
      const mockTask = { id: "task-1", ...input };
      mockFn(tasksDb.createTask).mockResolvedValue(mockTask as any);

      const result = await service.createTask(input);

      expect(tasksDb.createTask).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTask);
    });
  });

  describe("updateTask", () => {
    it("should update a task", async () => {
      const input = { id: "task-1", title: "Updated Task" };
      const mockTask = { id: "task-1", title: "Updated Task" };
      mockFn(tasksDb.updateTask).mockResolvedValue(mockTask as any);

      const result = await service.updateTask(input);

      expect(tasksDb.updateTask).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTask);
    });
  });

  describe("moveTask", () => {
    it("should move a task", async () => {
      const input = {
        id: "task-1",
        list_id: "list-2",
        position: 1,
      };
      const mockTask = { id: "task-1", list_id: "list-2", position: 1 };
      mockFn(tasksDb.moveTask).mockResolvedValue(mockTask as any);

      const result = await service.moveTask(input);

      expect(tasksDb.moveTask).toHaveBeenCalledWith(
        mockClient,
        input.id,
        input.list_id,
        input.position,
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe("assignTask", () => {
    it("should assign a task", async () => {
      const input = { id: "task-1", assigned_to: "user-1" };
      const mockTask = { id: "task-1", assigned_to: "user-1" };
      mockFn(usersDb.getUserById).mockResolvedValue({ id: "user-1" } as any);
      mockFn(tasksDb.updateTask).mockResolvedValue(mockTask as any);

      const result = await service.assignTask(input);

      expect(usersDb.getUserById).toHaveBeenCalledWith(mockClient, "user-1");
      expect(tasksDb.updateTask).toHaveBeenCalledWith(mockClient, {
        id: input.id,
        assigned_to: input.assigned_to,
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe("completeTask", () => {
    it("should complete a task", async () => {
      const mockTask = { id: "task-1", completed_at: "2024-01-01T00:00:00Z" };
      mockFn(tasksDb.completeTask).mockResolvedValue(mockTask as any);

      const result = await service.completeTask("task-1");

      expect(tasksDb.completeTask).toHaveBeenCalledWith(mockClient, "task-1");
      expect(result).toEqual(mockTask);
    });
  });

  describe("deleteTask", () => {
    it("should delete a task", async () => {
      mockFn(tasksDb.deleteTask).mockResolvedValue(undefined);

      await service.deleteTask("task-1");

      expect(tasksDb.deleteTask).toHaveBeenCalledWith(mockClient, "task-1");
    });
  });
});
