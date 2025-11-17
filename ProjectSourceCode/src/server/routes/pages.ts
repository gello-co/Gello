import express from "express";
import "../types/express.d.ts";

const router = express.Router();

// Page routes
router.get("/", (_req, res) => {
  res.render("pages/home", {
    title: "Gello",
  });
});

router.get("/login", (_req, res) => {
  res.redirect("/login/admin");
});

router.get("/login/admin", (_req, res) => {
  res.render("pages/login-admin", {
    title: "(TODO) Admin Login",
  });
});

router.get("/login/team", (_req, res) => {
  res.render("pages/login-team", {
    title: "(TODO) Team Member Login",
  });
});

router.post("/login/admin", (req, res) => {
  // dev bypass auth middleware sets user
  if (req.user) {
    return res.redirect("/profile/admin");
  }
  // TODO: Implement actual authentication
  res.status(401).render("pages/login-admin", {
    title: "(TODO) Admin Login",
    error: "Invalid credentials",
  });
});

router.post("/login/team", (req, res) => {
  // dev bypass auth middleware sets user
  if (req.user) {
    return res.redirect("/profile/team");
  }
  // TODO: Implement actual authentication
  res.status(401).render("pages/login-team", {
    title: "(TODO) Team Member Login",
    error: "Invalid credentials",
  });
});

router.get("/profile/admin", (req, res) => {
  res.render("pages/profile-admin", {
    title: "(TODO) Admin Profile",
    user: req.user || null,
    tasks: [],
    leaderboard: null,
  });
});

router.get("/profile/team", (req, res) => {
  res.render("pages/profile-team", {
    title: "(TODO) Team Member Profile",
    user: req.user || null,
    tasks: [],
    leaderboard: null,
  });
});

export default router;
