import express from "express";
import { isMockMode } from "../../contracts/container.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

/**
 * Helper to add mock mode flag to view context
 */
function withMockFlag<T extends object>(data: T): T & { mockMode: boolean } {
  return { ...data, mockMode: isMockMode() };
}

router.get(
  "/admin-permissions",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!req.user) throw new Error("User not authenticated");

      res.render(
        "pages/admin-permissions",
        withMockFlag({
          title: "Admin Permissions",
          layout: "dashboard",
          user: req.user,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
