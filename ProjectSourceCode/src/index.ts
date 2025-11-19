import { app } from "./server/app.js";
import { logger } from "./server/lib/logger.js";
import { env } from "./config/env.js";

const PORT = Number(process.env.PORT ?? 3000);
const isDevelopment = process.env.NODE_ENV !== "production";

// CSRF protection deferred to v0.2.0

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (env.DEV_BYPASS_AUTH === "true") {
    console.log("⚠️  DEV BYPASS ENABLED: All authentication is bypassed");
  }
});
