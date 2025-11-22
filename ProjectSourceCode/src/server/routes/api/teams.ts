import type { Request } from "express";
import express from "express";
import {
  createTeamSchema,
  updateTeamBodySchema,
} from "../../../lib/schemas/team.js";
import { TeamService } from "../../../lib/services/team.service.js";
import { getSupabaseClientForRequest } from "../../../lib/supabase.js";
import { requireAdmin } from "../../../middleware/requireAdmin.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireManager } from "../../../middleware/requireManager.js";
import { validate } from "../../../middleware/validation.js";

const router = express.Router();

async function getTeamService(req: Request) {
  const client = await getSupabaseClientForRequest(req);
  return new TeamService(client);
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const teams = await (await getTeamService(req)).getAllTeams();
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const team = await (await getTeamService(req)).getTeam(id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireManager,
  validate(createTeamSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const teamService = await getTeamService(req);
      // Create team and assign manager in service layer
      // Role check is handled by requireManager middleware
      // User assignment happens atomically in service layer
      const { team } = await teamService.createTeamWithManager(
        req.body,
        req.user.id,
      );

      res.status(201).json(team);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireManager,
  validate(updateTeamBodySchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "id parameter is required" });
      }
      const team = await (await getTeamService(req)).updateTeam({
        ...req.body,
        id,
      });
      res.json(team);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    await (await getTeamService(req)).deleteTeam(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:id/members", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const members = await (await getTeamService(req)).getTeamMembers(id);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/members", requireManager, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const user = await (await getTeamService(req)).addMemberToTeam(user_id, id);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:teamId/members/:userId",
  requireManager,
  async (req, res, next) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({ error: "userId parameter is required" });
      }
      const user = await (await getTeamService(req)).removeMemberFromTeam(
        userId,
      );
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
