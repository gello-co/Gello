import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";
import { engine } from "express-handlebars";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { devAuth } from "../middleware/dev-auth.js";
import { errorHandler } from "../middleware/error-handler.js";
import { requestLogger } from "../middleware/request-logger.js";
import { expressApp } from "./express-app.js";
import { helpers } from "./helpers/handlebars.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import boardsApiRouter from "./routes/boards/api.js";
import boardsPagesRouter from "./routes/boards/pages.js";
import leaderboardPagesRouter from "./routes/leaderboard/pages.js";
import listsRouter from "./routes/lists.js";
import pageRoutes from "./routes/pages.js";
import tasksApiRouter from "./routes/tasks/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

// Trust Render proxy for proper IP detection in rate limiting
if (isProd) {
  app.set("trust proxy", true);
}

const helmetOptions: Parameters<typeof helmet>[0] = isProd
  ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://kit.fontawesome.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
            "https://ka-f.fontawesome.com",
          ],
          fontSrc: [
            "'self'",
            "https://kit.fontawesome.com",
            "https://cdn.jsdelivr.net",
            "https://ka-f.fontawesome.com",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://ka-f.fontawesome.com"],
        },
      },
    }
  : {
      // Disable CSP/HSTS locally to prevent Supabase TLS + mkcert issues during tests.
      contentSecurityPolicy: false,
      strictTransportSecurity: false,
    };

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    ...helmetOptions,
  }),
);

if (isProd) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use("/api/", limiter);
}

// Handlebars configuration
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "./views/layouts"),
    partialsDir: path.join(__dirname, "./views/partials"),
    helpers,
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "./views"));

// Static files
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/css", express.static(path.join(__dirname, "../public/css")));
app.use("/js", express.static(path.join(__dirname, "../public/js")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Cookie parser for Supabase Auth sessions (httpOnly, secure cookies)
app.use(cookieParser());

// Request logging middleware (structured logging)
app.use(requestLogger);
app.use(devAuth);

// CSRF protection deferred to v0.2.0
// import { csrfProtection, csrfTokenToLocals } from "../../middleware/csrf.js";

// Apply CSRF protection to all routes (except GET requests which are safe)
// app.use(csrfProtection);
// Make CSRF token available to all views
// app.use(csrfTokenToLocals);

// Feature-based routes
app.use(authRoutes);
app.use("/api", apiRoutes);
app.use("/api/boards", boardsApiRouter);
app.use("/api/tasks", tasksApiRouter);
app.use("/api/lists", listsRouter);
app.use("/boards", boardsPagesRouter);
app.use("/leaderboard", leaderboardPagesRouter);
app.use("/", pageRoutes);
app.use("/", expressApp);

// Error handler must be last
app.use(errorHandler);

export { app };
