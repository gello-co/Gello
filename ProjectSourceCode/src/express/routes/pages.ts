import express from "express";
import "../../types/express.d.js";
import { BoardService } from "../../lib/services/board.service.js";
import { PointsService } from "../../lib/services/points.service.js";
import { TaskService } from "../../lib/services/task.service.js";
import { TeamService } from "../../lib/services/team.service.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

function getSupabase(req: express.Request) {
  if (!req.supabase) {
    throw new Error("Supabase client is not available on the request context.");
  }

  return req.supabase;
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
    const supabase = getSupabase(req);
    const teamService = new TeamService(supabase);
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
    const supabase = getSupabase(req);
    const teamService = new TeamService(supabase);
    const boardService = new BoardService(supabase);
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
    const supabase = getSupabase(req);
    const userId = req.user?.id;
    if (!userId) {
      return res.redirect("/login");
    }
    const pointsService = new PointsService(supabase, userId);
    const taskService = new TaskService(supabase);

    const pointsHistory = await pointsService.getPointsHistory(userId);
    const assignedTasks = await taskService.getTasksByAssignee(userId);

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
