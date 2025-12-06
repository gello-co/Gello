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
import { ItemsService } from "../services/items.service.js"; // <-- ADD THIS
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
function getItemsService() {           // <-- ADD THIS
  return new ItemsService(getSupabaseClient());
}

// ------------------------------------------------------
// LOGIN / REGISTER
// ------------------------------------------------------

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

// ------------------------------------------------------
// TASKS / BOARDS
// ------------------------------------------------------

// (UNCHANGED CODE ABOVE — omitted here for brevity)

// ------------------------------------------------------
// PROFILE / LEADERBOARD
// ------------------------------------------------------

// (UNCHANGED CODE ABOVE — omitted here for brevity)


// ------------------------------------------------------
// POINTS SHOP — UPDATED
// ------------------------------------------------------

router.get("/points-shop", requireAuth, async (req, res, next) => {
  try {
    const items = await getItemsService().getAllItems();

    res.render("pages/points-shop", {
      title: "Points Shop",
      layout: "dashboard",
      user: req.user!,
      items,
    });

  } catch (error) { 
    next(error);
  }
});


// ------------------------------------------------------
// POINTS SHOP REDEEM ROUTE (OPTIONAL BUT READY)
// ------------------------------------------------------

router.post("/points-shop/redeem/:itemId", requireAuth, async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    const user = req.user!;
    const itemsService = getItemsService();
    const pointsService = getPointsService(user.id);

    const item = await itemsService.getItemById(itemId);

    if (!item) {
      req.flash("error", "Item not found.");
      return res.redirect("/points-shop");
    }

    // Check balance
    const userPoints = await pointsService.getUserPoints(user.id);

    if (userPoints < item.points) {
      req.flash("error", "You do not have enough points.");
      return res.redirect("/points-shop");
    }

    // Deduct & redeem
    await pointsService.deductPoints(user.id, item.points);
    await itemsService.redeemItem(user.id, itemId);

    req.flash("success", `Successfully redeemed ${item.name}!`);
    res.redirect("/points-shop");

  } catch (err) {
    next(err);
  }
});


// ------------------------------------------------------
// TEAMS
// ------------------------------------------------------

router.get("/teams", requireAuth, async (req, res) => {
  res.render("pages/teams", { 
    title: "Join Team",
    layout: "dashboard",
    user: req.user,
  });
});


export default router;
