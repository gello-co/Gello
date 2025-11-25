import express from "express";
import "../../types/express.d.js";
import { isMockMode } from "../../contracts/container.js";
import {
  MOCK_BOARDS,
  MOCK_POINTS_HISTORY,
  MOCK_TASKS,
  MOCK_TEAMS,
  getMockBoardsByTeam,
  getMockUsersByTeam,
} from "../../contracts/fixtures/index.js";
import { BoardService } from "../../lib/services/board.service.js";
import { PointsService } from "../../lib/services/points.service.js";
import { TaskService } from "../../lib/services/task.service.js";
import { TeamService } from "../../lib/services/team.service.js";
import { requireAuth } from "../../middleware/requireAuth.js";

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

router.get("/", (req, res) => {
  // Redirect authenticated users to dashboard in mock mode, boards otherwise
  if (req.user) {
    return res.redirect(isMockMode() ? "/dashboard" : "/boards");
  }
  res.render("pages/home", {
    title: "Gello",
    layout: "main",
    mockMode: isMockMode(),
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
    let teams: typeof MOCK_TEAMS = [];

    if (isMockMode()) {
      teams = MOCK_TEAMS;
    } else {
      const supabase = getSupabase(req);
      const teamService = new TeamService(supabase);
      teams = await teamService.getAllTeams();
    }

    res.render(
      "pages/teams/index",
      withMockFlag({
        title: "Teams",
        layout: "dashboard",
        user: req.user,
        teams,
      }),
    );
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

    let team: (typeof MOCK_TEAMS)[0] | null | undefined;
    let members: Array<{
      id: string;
      display_name: string;
      email: string;
      role: string;
      team_id: string | null;
    }> = [];
    let boards: Array<{
      id: string;
      name: string;
      description: string | null;
      team_id: string | null;
      created_by: string | null;
      created_at: string;
    }> = [];

    if (isMockMode()) {
      team = MOCK_TEAMS.find((t) => t.id === id);
      if (team) {
        members = getMockUsersByTeam(id);
        boards = getMockBoardsByTeam(id);
      }
    } else {
      const supabase = getSupabase(req);
      const teamService = new TeamService(supabase);
      const boardService = new BoardService(supabase);
      team = await teamService.getTeam(id);
      if (team) {
        const rawMembers = await teamService.getTeamMembers(id);
        members = rawMembers.map((m) => ({
          id: m.id,
          display_name: m.display_name,
          email: m.email,
          role: m.role,
          team_id: m.team_id,
        }));
        boards = await boardService.getBoardsByTeam(id);
      }
    }

    if (!team) {
      return res.status(404).render("pages/404", {
        title: "Team Not Found",
        layout: "main",
      });
    }

    res.render(
      "pages/teams/detail",
      withMockFlag({
        title: team.name,
        layout: "dashboard",
        user: req.user,
        team,
        members,
        boards,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.redirect("/login");
    }

    let pointsHistory: typeof MOCK_POINTS_HISTORY = [];
    let assignedTasks: typeof MOCK_TASKS = [];

    if (isMockMode()) {
      pointsHistory = MOCK_POINTS_HISTORY.filter((p) => p.user_id === userId);
      assignedTasks = MOCK_TASKS.filter((t) => t.assigned_to === userId);
    } else {
      const supabase = getSupabase(req);
      const pointsService = new PointsService(supabase, userId);
      const taskService = new TaskService(supabase);
      pointsHistory = await pointsService.getPointsHistory(userId);
      assignedTasks = await taskService.getTasksByAssignee(userId);
    }

    res.render(
      "pages/profile/index",
      withMockFlag({
        title: "Profile",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        pointsHistory,
        assignedTasks,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
