import express from 'express';
import '../../types/express.d.js';
import { BoardService } from '../../lib/services/board.service.js';
import { PointsService } from '../../lib/services/points.service.js';
import { TaskService } from '../../lib/services/task.service.js';
import { TeamService } from '../../lib/services/team.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = express.Router();

function getSupabase(req: express.Request) {
  if (!req.supabase) {
    throw new Error('Supabase client is not available on the request context.');
  }
  return req.supabase;
}

router.get('/', (req, res) => {
  // Redirect authenticated users to boards
  if (req.user) {
    return res.redirect('/boards');
  }
  res.render('pages/home', {
    title: 'Gello',
    layout: 'main',
    styles: ['/css/landing.css'],
  });
});

router.get('/login', (_req, res) => {
  res.render('pages/auth/login', {
    title: 'Login',
    layout: 'auth',
  });
});

router.get('/register', (_req, res) => {
  res.render('pages/auth/register', {
    title: 'Register',
    layout: 'auth',
  });
});

router.get('/teams', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabase(req);
    const teamService = new TeamService(supabase);
    const teams = await teamService.getAllTeams();

    res.render('pages/teams/index', {
      title: 'Teams',
      layout: 'dashboard',
      user: req.user,
      teams,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/teams/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).render('pages/404', {
        title: 'Invalid Request',
        layout: 'main',
      });
    }

    const supabase = getSupabase(req);
    const teamService = new TeamService(supabase);
    const boardService = new BoardService(supabase);

    const team = await teamService.getTeam(id);
    if (!team) {
      return res.status(404).render('pages/404', {
        title: 'Team Not Found',
        layout: 'main',
      });
    }

    const rawMembers = await teamService.getTeamMembers(id);
    const members = rawMembers.map((m) => ({
      id: m.id,
      display_name: m.display_name,
      email: m.email,
      role: m.role,
      team_id: m.team_id,
    }));
    const boards = await boardService.getBoardsByTeam(id);

    res.render('pages/teams/detail', {
      title: team.name,
      layout: 'dashboard',
      user: req.user,
      team,
      members,
      boards,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.redirect('/login');
    }

    const supabase = getSupabase(req);
    const pointsService = new PointsService(supabase, userId);
    const taskService = new TaskService(supabase);
    const pointsHistory = await pointsService.getPointsHistory(userId);
    const assignedTasks = await taskService.getTasksByAssignee(userId);

    // Calculate completed task count
    const completedTaskCount = assignedTasks.filter((task) => task.completed_at !== null).length;

    // Calculate current activity streak (consecutive days with points earned)
    const currentStreak = calculateStreak(pointsHistory);

    res.render('pages/profile/index', {
      title: 'Profile',
      layout: 'dashboard',
      scripts: ['https://cdn.jsdelivr.net/npm/motion@11.18.2/dist/motion.js'],
      styles: ['/css/profile.css'],
      // biome-ignore lint/style/noNonNullAssertion: req.user is guaranteed by requireAuth middleware
      user: req.user!,
      pointsHistory,
      assignedTasks,
      completedTaskCount,
      currentStreak,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate streak of consecutive days with activity
 */
function calculateStreak(pointsHistory: Array<{ created_at: string }>): number {
  if (!pointsHistory || pointsHistory.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique dates with activity (sorted descending)
  const activityDates = [
    ...new Set(
      pointsHistory.map((entry) => {
        const date = new Date(entry.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    ),
  ].sort((a, b) => b - a);

  if (activityDates.length === 0) return 0;

  // Check if most recent activity is today or yesterday
  const mostRecent = activityDates[0];
  if (mostRecent === undefined) return 0;

  const daysDiff = Math.floor((today.getTime() - mostRecent) / (1000 * 60 * 60 * 24));

  // If last activity was more than 1 day ago, streak is broken
  if (daysDiff > 1) return 0;

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < activityDates.length; i++) {
    const prevDay = activityDates[i - 1];
    const currDay = activityDates[i];
    if (prevDay === undefined || currDay === undefined) break;

    const diff = Math.floor((prevDay - currDay) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default router;
