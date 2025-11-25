import express from "express";
import "../../../types/express.d.js";
import { BoardService } from "../../../lib/services/board.service.js";
import { ListService } from "../../../lib/services/list.service.js";
import { TaskService } from "../../../lib/services/task.service.js";
import { TeamService } from "../../../lib/services/team.service.js";
import { requireAuth } from "../../../middleware/requireAuth.js";

const router = express.Router();

function getSupabase(req: express.Request) {
  if (!req.supabase) {
    throw new Error("Supabase client is not available on the request context.");
  }

  return req.supabase;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    // requireAuth guarantees req.user is set when next() is called
    const supabase = getSupabase(req);
    const boardService = new BoardService(supabase);
    const teamId = req.query.team_id as string | undefined;
    let boards: Awaited<ReturnType<typeof boardService.getBoardsByTeam>> = [];
    if (teamId) {
      boards = await boardService.getBoardsByTeam(teamId);
    } else {
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      boards = await boardService.getBoardsForUser(req.user!.id);
    }
    res.render("boards/index", {
      title: "Boards",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      boards,
    });
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
    const supabase = getSupabase(req);
    const boardService = new BoardService(supabase);
    const listService = new ListService(supabase);
    const taskService = new TaskService(supabase);
    const teamService = new TeamService(supabase);

    const board = await boardService.getBoard(id);
    if (!board) {
      return res.status(404).render("pages/404", {
        title: "Board Not Found",
        layout: "main",
      });
    }

    const lists = await listService.getListsByBoard(id);
    const listsWithTasks = await Promise.all(
      lists.map(async (list) => {
        const tasks = await taskService.getTasksByList(list.id);
        return { ...list, tasks };
      }),
    );

    let users: Array<{ id: string; display_name: string }> = [];
    if (board.team_id) {
      const members = await teamService.getTeamMembers(board.team_id);
      users = members.map((m) => ({
        id: m.id,
        display_name: m.display_name,
      }));
    }

    res.render("boards/detail", {
      title: board.name,
      layout: "dashboard",
      user: req.user,
      board,
      lists: listsWithTasks,
      users,
      scripts: ["/js/board.js", "/js/task-modal.js", "/js/task-card.js"],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
