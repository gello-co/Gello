import { bunTranspiler } from "@hono/bun-transpiler";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();
const isProd = process.env.NODE_ENV === "production";

// API routes
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/hello", (c) =>
	c.json({ message: "Hello, world!", method: "GET" }),
);

app.put("/api/hello", async (c) =>
	c.json({ message: "Hello, world!", method: "PUT" }),
);

app.get("/api/hello/:name", (c) =>
	c.json({ message: `Hello, ${c.req.param("name")}!` }),
);

// Transpile TS/TSX modules on the fly in dev (Bun)
// Allows <script type="module" src="/frontend.tsx"> in index.html
if (!isProd) {
	app.get("/:script{.+\\.(ts|tsx)}", bunTranspiler());
}

// Serve static assets and SPA fallback
if (isProd) {
	// In production, serve built assets from dist
	app.use("/assets/*", serveStatic({ root: "./dist" }));
	app.get("/", serveStatic({ path: "./dist/index.html" }));
	app.get("/*", serveStatic({ path: "./dist/index.html" }));
} else {
	// In development, serve source files and enable TS/TSX transpile
	app.use("/public/*", serveStatic({ root: "./" }));
	app.get("/", serveStatic({ path: "./src/index.html" }));
	app.get("/*", serveStatic({ path: "./src/index.html" }));
}

export { app };
