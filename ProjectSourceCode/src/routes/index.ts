import express from 'express';
import userRouter from "./users";
import adminRouter from "./admin";
import leaderboardRouter from "./leaderboard";
import tasksRouter from "./tasks";
import pagesRouter from "./pages";
import authRouter from "./auth";
import teamRouter from "./teams";
import pageTestRouter from "./pages-testing.js";

const router = express.Router();

router.use('/users', userRouter);
router.use('/admin', adminRouter);
router.use('/pages', pagesRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/tasks', tasksRouter);
router.use('/auth', authRouter);
router.use('/teams', teamRouter);
router.use('/test', pageTestRouter);

router.get("/", (req, res) => {
  // Redirect authenticated users to boards page
  if (req.user) {
    return res.redirect("pages/boards");
  }
  res.render("pages/home", {
    title: "Gello",
    layout: "main",
  });
});

// router.get("/task-member", (req, res) => {
//   res.render("pages/admin/tasks", {
//     title: "Gello",
//     layout: "main",
//   });
// });


export default router;