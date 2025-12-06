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
import { env } from "../utils/env.js";

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
    const taskService = getTaskService();
    const supabase = getSupabaseClient();
    const isAdmin = req.user?.role === "admin";
    
    if(isAdmin){
      const allTasks = await taskService.getAllTasks();
      
      // Fetch all users to create a lookup map
      const { data: users } = await supabase
        .from("users")
        .select("id, display_name");
      
      const usersMap: Record<string, string> = {};
      users?.forEach(user => {
        usersMap[user.id] = user.display_name;
      });
      
      res.render("pages/admin/tasks", {
        title: "Tasks",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        tasks: allTasks,
        usersMap,
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
      });
    }else{
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      const tasks = await taskService.getTasksByAssignee(req.user!.id);
      res.render("pages/member/tasks", {
        title: "My Tasks",
        layout: "dashboard",
        // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
        user: req.user!,
        tasks,
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
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
    const isAdmin = req.user?.role === "admin";

    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    const pointsHistory = await pointsService.getPointsHistory(req.user!.id);
    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    let assignedTasks = isAdmin ? await taskService.getAllTasks() : await taskService.getTasksByAssignee(req.user!.id);

    res.render("pages/profile", {
      title: "Profile",
      layout: "dashboard",
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      pointsHistory,
      assignedTasks,
      isAdmin,
    });
    
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
    
    res.render("pages/leaderboard", {
      title: "Leaderboard",
      layout: "dashboard",
      user: req.user,
      topThree,
      others,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const { display_name, email } = req.body;
    
    if (!display_name || !email) {
      return res.status(400).json({ error: "Display name and email are required" });
    }

    // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
    const supabase = getSupabaseClient();
    
    // Update the users table
    const { data, error } = await supabase
      .from("users")
      .update({ display_name, email })
      .eq("id", req.user!.id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return res.status(400).json({ error: error.message });
    }

    // Update auth email using admin client
    const { getSupabaseAdminClient } = await import("../lib/supabase.js");
    const adminSupabase = getSupabaseAdminClient();
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      req.user!.id,
      { email: email }
    );

    if (authError) {
      console.error("Auth email update error:", authError);
      return res.status(400).json({ error: `Failed to update auth email: ${authError.message}` });
    }

    res.json({ success: true, user: data });
  } catch (error) {
    console.error("Profile update exception:", error);
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
