import express from "express";
import pointsShopRouter from "./express-routes/points-shop.js";
import leaderboardRouter from "./express-routes/leaderboard.js";
import tasksRouter from "./express-routes/tasks.js";
import adminPermissionsRouter from "./express-routes/admin-permissions.js";
import { devAuth } from "./express-middleware/dev-auth.js";

const expressApp = express.Router();

// Apply dev auth middleware to all express routes
expressApp.use(devAuth);

// Mount routes
expressApp.use(pointsShopRouter);
expressApp.use(leaderboardRouter);
expressApp.use(tasksRouter);
expressApp.use(adminPermissionsRouter);

export { expressApp };
