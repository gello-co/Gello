import express from "express";
import "../types/express.d.js";

const router = express.Router();

router.get("/task-admin", (_req, res) => {
  res.render("pages/boards/tasks-admin", {
    title: "Pages Testing",
    layout: "dashboard"
  });
});

router.get("/points-shop", (_req, res) => {
  res.render("pages/points-shop/index", {
    title: "Points Shop",
    layout: "dashboard"
  });
});

export default router;  