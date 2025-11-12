import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { engine } from "express-handlebars";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { helpers } from "./helpers/handlebars.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Handlebars configuration
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "../views/layouts"),
    partialsDir: path.join(__dirname, "../views/partials"),
    helpers,
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../views"));

// Static files
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/css", express.static(path.join(__dirname, "../public/css")));
app.use("/js", express.static(path.join(__dirname, "../public/js")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import apiRoutes from "./routes/api.js";
import boardsRouter from "./routes/boards.js";
import listsRouter from "./routes/lists.js";
import pageRoutes from "./routes/pages.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";

app.use("/api", apiRoutes);
app.use("/api/boards", boardsRouter);
app.use("/api/lists", listsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/", pageRoutes);

export { app };
