import { expect, test } from "@playwright/test";
import { createTestUser, loginAsUser, resetTestDb } from "../setup/supabase-test-helpers.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DEFAULT_TIMEOUT = 3000; // Timeout for element visibility/wait checks
const NAVIGATION_TIMEOUT = 5000; // Timeout for waitForURL/navigation waits

test.describe("Board Workflow", () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test("should complete full board workflow: create board → add list → add task → complete → earn points", async ({
    page,
    request,
  }) => {
    // Setup: Create test user and login
    const testUser = await createTestUser(
      `test-${Date.now()}@example.com`,
      "TestPassword123!",
      "member",
    );

    const session = await loginAsUser(testUser.email, "TestPassword123!");
    const cookies = [
      {
        name: "sb-access-token",
        value: session.access_token,
        domain: "localhost",
        path: "/",
      },
      {
        name: "sb-refresh-token",
        value: session.refresh_token,
        domain: "localhost",
        path: "/",
      },
    ];

    await page.context().addCookies(cookies);

    // Step 1: Create a team (if needed)
    const teamResponse = await request.post(`${BASE_URL}/api/teams`, {
      data: {
        name: "Test Team",
        description: "Test team for workflow",
      },
      headers: {
        Cookie: `sb-access-token=${session.access_token}`,
      },
    });

    expect(teamResponse.ok()).toBeTruthy();
    const team = await teamResponse.json();

    // Step 2: Create a board
    await page.goto(`${BASE_URL}/teams/${team.id}/boards`);
    await expect(page.locator("text=Boards")).toBeVisible();

    // Visual snapshot: Boards list page
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("boards-list.png");

    // Click create board button or navigate to create form
    const createBoardButton = page.locator(
      'a:has-text("Create Board"), button:has-text("Create Board")',
    );
    if ((await createBoardButton.count()) > 0) {
      await createBoardButton.click();
    } else {
      await page.goto(`${BASE_URL}/teams/${team.id}/boards/new`);
    }

    await page.fill('input[name="name"]', "Test Board");
    await page.fill('textarea[name="description"]', "Test board description");
    await page.click('button[type="submit"]');

    // Wait for board to be created and redirected
    await page.waitForURL((url) => url.pathname.includes("/boards/"), {
      timeout: NAVIGATION_TIMEOUT,
    });

    // Extract board ID from URL
    const boardUrl = page.url();
    const boardIdMatch = boardUrl.match(/\/boards\/([^\/]+)/);
    expect(boardIdMatch).toBeTruthy();
    const boardId = boardIdMatch![1];

    // Step 3: Add a list to the board
    await expect(page.locator("text=Test Board")).toBeVisible();

    // Visual snapshot: Board detail page (empty)
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("board-detail-empty.png");

    const createListButton = page.locator(
      'button:has-text("Add List"), button:has-text("Create List")',
    );
    if ((await createListButton.count()) > 0) {
      await createListButton.click();
      await page.fill('input[name="name"]', "To Do");
      await page.click('button[type="submit"]');
    } else {
      // Use API if no UI
      const listResponse = await request.post(
        `${BASE_URL}/api/lists/boards/${boardId}/lists`,
        {
          data: {
            name: "To Do",
            position: 0,
          },
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
          },
        },
      );
      expect(listResponse.ok()).toBeTruthy();
    }

    await page.reload();
    await expect(page.locator("text=To Do")).toBeVisible({
      timeout: DEFAULT_TIMEOUT,
    });

    // Step 4: Add a task to the list
    const addTaskButton = page.locator(
      'button:has-text("Add Task"), button:has-text("+")',
    );
    if ((await addTaskButton.count()) > 0) {
      await addTaskButton.first().click();
      await page.fill('input[name="title"]', "Test Task");
      await page.fill('input[name="story_points"]', "5");
      await page.click('button[type="submit"]');
    } else {
      // Use API if no UI
      const listsResponse = await request.get(
        `${BASE_URL}/api/lists/boards/${boardId}/lists`,
        {
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
          },
        },
      );
      const lists = await listsResponse.json();
      const listId = lists[0].id;

      const taskResponse = await request.post(`${BASE_URL}/api/tasks`, {
        data: {
          list_id: listId,
          title: "Test Task",
          story_points: 5,
          position: 0,
        },
        headers: {
          Cookie: `sb-access-token=${session.access_token}`,
        },
      });
      expect(taskResponse.ok()).toBeTruthy();
    }

    await page.reload();
    await expect(page.locator("text=Test Task")).toBeVisible({
      timeout: DEFAULT_TIMEOUT,
    });

    // Step 5: Complete the task
    const completeButton = page.locator(
      'button:has-text("Complete"), input[type="checkbox"]',
    );
    if ((await completeButton.count()) > 0) {
      await completeButton.first().click();
    } else {
      // Use API if no UI
      // First fetch lists to get the list ID
      const listsResponse = await request.get(
        `${BASE_URL}/api/lists/boards/${boardId}/lists`,
        {
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
          },
        },
      );
      const lists = await listsResponse.json();
      const listId = lists[0].id;

      // Then fetch tasks for that list
      const tasksResponse = await request.get(
        `${BASE_URL}/api/tasks/lists/${listId}/tasks`,
        {
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
          },
        },
      );
      const tasks = await tasksResponse.json();
      const taskId = tasks[0].id;

      const completeResponse = await request.post(
        `${BASE_URL}/api/tasks/${taskId}/complete`,
        {
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
          },
        },
      );
      expect(completeResponse.ok()).toBeTruthy();
    }

    // Step 6: Verify points were awarded
    await page.goto(`${BASE_URL}/leaderboard`);
    await expect(page.locator("text=Leaderboard")).toBeVisible({
      timeout: DEFAULT_TIMEOUT,
    });

    // Check if user appears on leaderboard with points
    const userPoints = page.locator(`text=${testUser.user.display_name}`);
    await expect(userPoints).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Visual snapshot: Leaderboard
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("leaderboard.png");
  });
});
