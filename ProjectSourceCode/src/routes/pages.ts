/**
 * Routes for rendering pages
 */
import express from "express";
import "../types/express.d.js";
import { BoardService } from "../services/board.service.js";
import { LeaderboardService } from "../services/leaderboard.service.js";
import { ListService } from "../services/list.service.js";
import { PointsService } from "../services/points.service.js";
import { TaskService } from "../services/task.service.js";
import { TeamService } from "../services/team.service.js";
import { getSupabaseClient } from "../lib/supabase.js";
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

function getPointsService(userId?: string) {
  return new PointsService(getSupabaseClient(), userId);
}

router.get("/login", (_req, res) => {
  res.render("pages/login", {
    title: "Login",
    layout: "auth",
  });
});

router.get("/register", (_req, res) => {
  res.render("pages/register", {
    title: "Register",
    layout: "auth",
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

router.get("/tasks", requireAuth, async (req, res, next) => {
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
    const isAdmin = req.user?.role === "admin";
    if(isAdmin){
      res.render("pages/admin/tasks", {
        title: "Boards",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        boards,
      });
    }else{
      res.render("pages/member/tasks", {
        title: "Boards",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        boards,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/:id", requireAuth, async (req, res, next) => {
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

    res.render("pages/tasks", {
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
    const isManager = req.user.role === "manager" || req.user.role === "admin";

    if(isManager){
      res.render("pages/admin/profile", {
      title: "Profile",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      pointsHistory,
      assignedTasks,
      })
    }else{
      res.render("pages/member/profile", {
      title: "Profile",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      pointsHistory,
      assignedTasks,
      });
    }
    
  } catch (error) {
    next(error);
  }
});

router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error("User not authenticated");

    const leaderboardService = new LeaderboardService(getSupabaseClient());
    const leaderboard = await leaderboardService.getLeaderboard(100);

    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);
    const isManager = req.user.role === "manager" || req.user.role === "admin";
    
    if(isManager){
      res.render("pages/admin/leaderboard", {
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      topThree,
      others,
      isManager,
      });
    } else{
      res.render("pages/member/leaderboard", {
        title: "Leaderboard",
        layout: "dashboard",
        user: req.user,
        topThree,
        others,
        isManager,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/points-shop", requireAuth, async (req, res, next) => {
  //let item = await getItemsService().getAllItems();
  try {
    res.render("pages/points-shop/index", {
      title: "Points Shop",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
    });
    
  }catch (error) {
    next(error);
  }
});



export default router;
