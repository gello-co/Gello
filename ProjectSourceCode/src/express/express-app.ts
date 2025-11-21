import express from "express";
import { devAuth } from "./express-middleware/dev-auth.js";
import adminPermissionsRouter from "./express-routes/admin-permissions.js";
import leaderboardRouter from "./express-routes/leaderboard.js";
import pointsShopRouter from "./express-routes/points-shop.js";
import tasksRouter from "./express-routes/tasks.js";

const expressApp = express.Router();

// Apply dev auth middleware to all express routes
expressApp.use(devAuth);

// Mount routes
expressApp.use(pointsShopRouter);
expressApp.use(leaderboardRouter);
expressApp.use(tasksRouter);
expressApp.use(adminPermissionsRouter);

export { expressApp };
