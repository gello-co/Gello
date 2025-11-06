import express from "express";
import "../types/express.d.ts";

const router = express.Router();

// Page routes
router.get("/viewBoards", (_req, res) => {
  res.render("pages/boards", {
    title: "View Boards",
  });
});

router.post("/createBoard", (_req, res) => {
  res.render("pages/login-admin", {
    title: "(TODO) Admin Login",
  });
});

router.put("/updateBoard", (_req, res) => {
  res.render("pages/login-team", {
    title: "(TODO) Team Member Login",
  });
});

router.delete("/deleteBoard", (_req, res) =>{

});

export default router;