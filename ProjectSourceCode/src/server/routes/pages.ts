import express from "express";
import "../types/express.d.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { BoardService } from "../../lib/services/board.service.js";
import { ListService } from "../../lib/services/list.service.js";
import { PointsService } from "../../lib/services/points.service.js";
import { TaskService } from "../../lib/services/task.service.js";
import { TeamService } from "../../lib/services/team.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";

const router = express.Router();

function getBoardService() {
  return new BoardService(getSupabaseClient());
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
    layout: "main",
  });
});

router.get("/login", (_req, res) => {
  res.render("pages/auth/login", {
    title: "Login",
    layout: "auth",
  });
});

router.get("/register", (_req, res) => {
  res.render("pages/auth/register", {
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

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    // requireAuth guarantees req.user is set when next() is called
    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    const pointsService = getPointsService(req.user!.id);
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

export default router;
