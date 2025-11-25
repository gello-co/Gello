import express from "express";
import "../types/express.d.js";
import { BoardService } from "../../lib/services/board.service.js";
import { ListService } from "../../lib/services/list.service.js";
import { PointsService } from "../../lib/services/points.service.js";
import { TaskService } from "../../lib/services/task.service.js";
import { TeamService } from "../../lib/services/team.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { ResourceNotFoundError } from "@/lib/errors/app.errors.js";

const router = express.Router();

function getBoardService() {
  return new BoardService(getSupabaseClient());
}

function getListService() {
  return new ListService(getSupabaseClient());
}

function getTaskService() {
  return new TaskService(getSupabaseClient());
}

function getTeamService() {
  return new TeamService(getSupabaseClient());
}

function getPointsService(userId?: string) {
  return new PointsService(getSupabaseClient(), userId);
}

router.get("/", (req, res) => {
  // Redirect authenticated users to boards page
  if (req.user) {
    return res.redirect("/boards");
  }
  res.render("pages/home", {
    title: "Gello",
  });
});

router.get("/register", (req, res) => {
  res.render("pages/auth/register");
});

router.get("/login", (_req, res) => {
  res.render("pages/auth/login", {
    title: "Login",
    layout: "auth",
  });
});

router.get("/login/team", (_req, res) => {
  res.render("pages/login-team", {
    title: "(TODO) Team Member Login",
  });
});

router.get("/teams", requireAuth, async (req, res, next) => {
  try {
    const teamService = getTeamService();
    const teams = await teamService.getAllTeams();
    res.render("pages/teams/index", {
      title: "Teams",
      layout: "dashboard",
      user: req.user,
      teams,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/teams/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).render("pages/404", {
        title: "Invalid Request",
        layout: "main",
      });
    }
    const teamService = getTeamService();
    const boardService = getBoardService();
    const team = await teamService.getTeam(id);
    if (!team) {
      return res.status(404).render("pages/404", {
        title: "Team Not Found",
        layout: "main",
      });
    }
    const members = await teamService.getTeamMembers(id);
    const boards = await boardService.getBoardsByTeam(id);
    res.render("pages/teams/detail", {
      title: team.name,
      layout: "dashboard",
      user: req.user,
      team,
      members,
      boards,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/boards", requireAuth, async (req, res, next) => {
  try {
    // requireAuth guarantees req.user is set when next() is called
    const boardService = getBoardService();
    const teamId = req.query.team_id as string | undefined;
    let boards: Awaited<ReturnType<typeof boardService.getBoardsByTeam>> = [];
    if (teamId) {
      boards = await boardService.getBoardsByTeam(teamId);
    } else {
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      boards = await boardService.getBoardsForUser(req.user!.id);
    }
    res.render("pages/boards/index", {
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

router.get("/boards-test", async (req, res, next) => {
    res.render("pages/boards/index");
});

router.get("/boards/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).render("pages/404", {
        title: "Invalid Request",
        layout: "main",
      });
    }
    const boardService = getBoardService();
    const listService = getListService();
    const taskService = getTaskService();
    const teamService = getTeamService();

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

    res.render("pages/boards/detail", {
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

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    // requireAuth guarantees req.user is set when next() is called
    const pointsService = getPointsService(req.user?.id);
    const taskService = getTaskService();

    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    const pointsHistory = await pointsService.getPointsHistory(req.user!.id);
    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    const assignedTasks = await taskService.getTasksByAssignee(req.user!.id);

    res.render("pages/profile/index", {
      title: "Profile",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      pointsHistory,
      assignedTasks,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile-test", async (req, res) => {
  res.render("pages/profile/index");
  //TODO: Delete route after logins are fixed
});

router.get("/tasks-admin-test",async (req, res) => {
  res.render("pages/tasks-admin");
  //TODO: Delete router after logins are fixed
});


router.get("/tasks-admin-test",async (req, res) => {
  res.render("pages/tasks-team");
  //TODO: Delete router after logins are fixed
});

router.get("/points-shop",async (req, res) => {
  res.render("pages/points-shop/index");
  //TODO: Delete router after logins are fixed
})
export default router;
