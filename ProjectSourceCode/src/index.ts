import { app } from "./express/app.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env.PORT ?? 3000);
const isDevelopment = process.env.NODE_ENV !== "production";

// CSRF protection deferred to v0.2.0

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      baseUrl: `http://localhost:${PORT}`,
      nodeEnv: process.env.NODE_ENV ?? "development",
      csrfProtection: "Disabled (deferred to v0.2.0)",
    },
    "Server started",
  );

  if (isDevelopment) {
    logger.debug("Development environment details logged above");
  }
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Received shutdown signal");
  const forceExit = setTimeout(() => {
    logger.error({ signal }, "Shutdown timeout reached, forcing exit");
    process.exit(1);
  }, 10_000).unref();

  let exitCode = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    exitCode = 1;
    logger.error({ error, signal }, "Error closing HTTP server");
  }

  clearTimeout(forceExit);
  process.exit(exitCode);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

// Export app for testing
export default app;
