import express from "express";
import { csrfProtection, getCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

// CSRF token endpoint (must be before csrfProtection middleware)
// This endpoint needs csrfProtection to generate the token
router.get("/csrf-token", csrfProtection, getCsrfToken);

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

//CRUD user routes

//"Create" user
router.post("/register", (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  try {
    res.status(200).send("Success");
  } catch (err) {
    console.log(err);
  }
});

//CRUD board routes

router.get("/viewBoards", async (req, res) => {});

router.post("/createBoard", async (req, res) => {});

router.put("/updateBoard", async (req, res) => {});

router.delete("/deleteBoard", async (req, res) => {});

export default router;
