import express from "express";
import "../types/express.d.js";
import { BoardService } from "../../lib/services/board.service.js";
import { LeaderboardService } from "../../lib/services/leaderboard.service.js";
import { ListService } from "../../lib/services/list.service.js";
import { PointsService } from "../../lib/services/points.service.js";
import { TaskService } from "../../lib/services/task.service.js";
import { TeamService } from "../../lib/services/team.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../middleware/requireAuth.js";

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

function getLeaderboardService() {
  return new LeaderboardService(getSupabaseClient());
}

function getPointsService(userId?: string) {
  return new PointsService(getSupabaseClient(), userId);
}

router.get("/", (_req, res) => {
  res.render("pages/home", {
    title: "Gello",
  });
});

router.get("/register", (req, res) => {
  res.render("pages/auth/register");
});

router.get("/login", (_req, res) => {
  res.redirect("/login/admin");
});

router.get("/login/admin", (_req, res) => {
  res.render("pages/login-admin", {
    title: "(TODO) Admin Login",
  });
});

router.get("/login/team", (_req, res) => {
  res.render("pages/login-team", {
    title: "(TODO) Team Member Login",
  });
});

router.post("/login/admin", (req, res) => {
  // dev bypass auth middleware sets user
  if (req.user) {
    return res.redirect("/profile/admin");
  }
  // TODO: Implement actual authentication
  res.status(401).render("pages/login-admin", {
    title: "(TODO) Admin Login",
    error: "Invalid credentials",
  });
});

router.post("/login/team", (req, res) => {
  // dev bypass auth middleware sets user
  if (req.user) {
    return res.redirect("/profile/team");
  }
  // TODO: Implement actual authentication
  res.status(401).render("pages/login-team", {
    title: "(TODO) Team Member Login",
    error: "Invalid credentials",
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
    const boardService = getBoardService();
    const teamId = req.query.team_id as string | undefined;
    let boards: Awaited<ReturnType<typeof boardService.getBoardsByTeam>> = [];
    if (teamId) {
      boards = await boardService.getBoardsByTeam(teamId);
    } else {
      boards = [];
    }
    res.render("pages/boards/index", {
      title: "Boards",
      layout: "dashboard",
      user: req.user,
      boards,
    });
  } catch (error) {
    next(error);
  }
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
      scripts: ["/js/board.js"],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    const leaderboardService = getLeaderboardService();
    const leaderboard = await leaderboardService.getLeaderboard(100);
    res.render("pages/leaderboard/index", {
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }
    const pointsService = getPointsService(req.user.id);
    const taskService = getTaskService();

    const pointsHistory = await pointsService.getPointsHistory(req.user.id);
    const assignedTasks = await taskService.getTasksByAssignee(req.user.id);

    res.render("pages/profile/index", {
      title: "Profile",
      layout: "dashboard",
      user: req.user,
      pointsHistory,
      assignedTasks,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/points-shop", async (req, res, next) =>{
  res.render("pages/points-shop/index");
});

export default router;
