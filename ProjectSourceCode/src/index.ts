import { app } from "./server/app.js";
import { logger } from "./server/lib/logger.js";

const PORT = Number(process.env.PORT ?? 3000);
const isDevelopment = process.env.NODE_ENV !== "production";

// CSRF protection deferred to v0.2.0

app.listen(PORT, () => {
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
