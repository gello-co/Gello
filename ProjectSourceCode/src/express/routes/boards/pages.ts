import express from "express";
import "../../../types/express.d.js";
import { isMockMode } from "../../../contracts/container.js";
import {
  MOCK_BOARDS,
  MOCK_LISTS,
  MOCK_TASKS,
  getMockBoardsByTeam,
  getMockListsByBoard,
  getMockTasksByList,
  getMockUsersByTeam,
} from "../../../contracts/fixtures/index.js";
import { BoardService } from "../../../lib/services/board.service.js";
import { ListService } from "../../../lib/services/list.service.js";
import { TaskService } from "../../../lib/services/task.service.js";
import { TeamService } from "../../../lib/services/team.service.js";
import { requireAuth } from "../../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

function getSupabase(req: express.Request) {
  if (!req.supabase) {
    throw new Error("Supabase client is not available on the request context.");
  }

  return req.supabase;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const teamId = req.query.team_id as string | undefined;
    let boards: typeof MOCK_BOARDS = [];

    if (isMockMode()) {
      // In mock mode, filter by team_id or show all boards for user's team
      if (teamId) {
        boards = getMockBoardsByTeam(teamId);
      } else {
        // Show boards from user's team
        const userTeamId = req.user?.team_id;
        boards = userTeamId ? getMockBoardsByTeam(userTeamId) : MOCK_BOARDS;
      }
    } else {
      const supabase = getSupabase(req);
      const boardService = new BoardService(supabase);
      if (teamId) {
        boards = await boardService.getBoardsByTeam(teamId);
      } else {
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        boards = await boardService.getBoardsForUser(req.user!.id);
      }
    }

    res.render(
      "boards/index",
      withMockFlag({
        title: "Boards",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        boards,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).render("pages/404", {
        title: "Board Not Found",
        layout: "main",
      });
    }

    let board: (typeof MOCK_BOARDS)[0] | null | undefined;
    let listsWithTasks: Array<{
      id: string;
      board_id: string;
      name: string;
      position: number;
      created_at: string;
      tasks: Array<unknown>;
    }> = [];
    let users: Array<{ id: string; display_name: string }> = [];

    if (isMockMode()) {
      board = MOCK_BOARDS.find((b) => b.id === id);
      if (board) {
        const lists = getMockListsByBoard(id);
        listsWithTasks = lists.map((list) => ({
          ...list,
          tasks: getMockTasksByList(list.id),
        }));
        if (board.team_id) {
          const members = getMockUsersByTeam(board.team_id);
          users = members.map((m) => ({
            id: m.id,
            display_name: m.display_name,
          }));
        }
      }
    } else {
      const supabase = getSupabase(req);
      const boardService = new BoardService(supabase);
      const listService = new ListService(supabase);
      const taskService = new TaskService(supabase);
      const teamService = new TeamService(supabase);

      board = await boardService.getBoard(id);
      if (board) {
        const lists = await listService.getListsByBoard(id);
        listsWithTasks = await Promise.all(
          lists.map(async (list) => {
            const tasks = await taskService.getTasksByList(list.id);
            return { ...list, tasks };
          }),
        );
        if (board.team_id) {
          const members = await teamService.getTeamMembers(board.team_id);
          users = members.map((m) => ({
            id: m.id,
            display_name: m.display_name,
          }));
        }
      }
    }

    if (!board) {
      return res.status(404).render("pages/404", {
        title: "Board Not Found",
        layout: "main",
      });
    }

    res.render(
      "boards/detail",
      withMockFlag({
        title: board.name,
        layout: "dashboard",
        user: req.user,
        board,
        lists: listsWithTasks,
        users,
        scripts: ["/js/board.js", "/js/task-modal.js", "/js/task-card.js"],
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
