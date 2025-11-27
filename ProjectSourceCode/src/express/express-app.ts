import express from "express";
import { devAuth } from "../middleware/dev-auth.js";
import adminPermissionsRouter from "./routes/admin-permissions.js";
import leaderboardRouter from "./routes/leaderboard-pages.js";
import pointsShopRouter from "./routes/points-shop-pages.js";
import tasksRouter from "./routes/tasks-pages.js";

const expressApp = express.Router();

// Apply dev auth middleware to all express routes
expressApp.use(devAuth);

// Mount routes
expressApp.use(pointsShopRouter);
expressApp.use(leaderboardRouter);
expressApp.use(tasksRouter);
expressApp.use(adminPermissionsRouter);

export { expressApp };
