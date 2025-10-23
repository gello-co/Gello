import { serve } from "bun";
import { app } from "./server/app";

const server = serve({
	port: Number(process.env.PORT ?? 3000),
	fetch: app.fetch,
	development: process.env.NODE_ENV !== "production" && {
		// Enable browser hot reloading in development
		hmr: true,
		// Echo console logs from the browser to the server
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
