import type { Request } from 'express';
import express from 'express';
import { createTeamSchema, updateTeamBodySchema } from '../../lib/schemas/team.js';
import { TeamService } from '../../lib/services/team.service.js';
import { getServiceRoleClient } from '../../lib/supabase.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireManager } from '../../middleware/requireManager.js';
import { validate } from '../../middleware/validation.js';

const router = express.Router();

// Use req.supabase set by requireAuth middleware (supports test bypass)
// This is for operations that respect RLS (read operations)
function getTeamService(req: Request) {
  if (!req.supabase) {
    throw new Error('Supabase client is not available on the request context.');
  }
  return new TeamService(req.supabase);
}

// Use service role client for operations that bypass RLS
// This is needed for:
// - Creating teams (manager may not have a team yet, so RLS would block)
// - Modifying teams (manager's team_id must match, but we need flexibility)
// - Admin operations
function getAdminTeamService() {
  return new TeamService(getServiceRoleClient());
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const teams = await getTeamService(req).getAllTeams();
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    const team = await getTeamService(req).getTeam(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireManager, validate(createTeamSchema), async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use service role client to bypass RLS for team creation
    // A manager without a team can create a new team and be assigned to it
    const teamService = getAdminTeamService();
    const { team } = await teamService.createTeamWithManager(req.body, req.user.id);

    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireManager, validate(updateTeamBodySchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    // Use service role client for team updates
    const team = await getAdminTeamService().updateTeam({
      ...req.body,
      id,
    });
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    // Use service role client for team deletion
    await getAdminTeamService().deleteTeam(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    const members = await getTeamService(req).getTeamMembers(id);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', requireManager, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    // Use service role client to modify team membership
    const user = await getAdminTeamService().addMemberToTeam(user_id, id);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/:teamId/members/:userId', requireManager, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }
    // Use service role client to modify team membership
    const user = await getAdminTeamService().removeMemberFromTeam(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
