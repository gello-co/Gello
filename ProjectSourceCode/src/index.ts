import { app } from "./server/app.js";
import { env } from "./config/env.js";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (env.DEV_BYPASS_AUTH === "true") {
    console.log("⚠️  DEV BYPASS ENABLED: All authentication is bypassed");
  }
});
