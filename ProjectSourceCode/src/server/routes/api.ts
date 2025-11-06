import express from "express";

const router = express.Router();

// API routes
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/hello", (_req, res) => {
  res.json({ message: "Hello, world!", method: "GET" });
});

router.put("/hello", (_req, res) => {
  res.json({ message: "Hello, world!", method: "PUT" });
});

router.get("/hello/:name", (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

export default router;
