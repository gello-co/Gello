import express from "express";
import "../types/express.d.ts";

const router = express.Router();

// Page routes
router.get("/", (_req, res) => {
	res.render("pages/home", {
		title: "Gello",
	});
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
