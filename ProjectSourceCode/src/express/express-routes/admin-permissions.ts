import express from "express";
import { requireAdmin } from "../../server/middleware/requireAdmin.js";
import { requireAuth } from "../../server/middleware/requireAuth.js";

const router = express.Router();

router.get(
  "/admin-permissions",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) throw new Error("User not authenticated");

      res.render("pages/admin-permissions", {
        title: "Admin Permissions",
        layout: "dashboard",
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
