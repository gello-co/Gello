import type { NextFunction, Request, Response } from 'express';
import { BoardService } from '../lib/services/board.service.js';
import { LeaderboardService } from '../lib/services/leaderboard.service.js';
import { ListService } from '../lib/services/list.service.js';
import { PointsService } from '../lib/services/points.service.js';
import { TaskService } from '../lib/services/task.service.js';

/**
 * Service injection middleware - instantiates all services and makes them available via res.locals.services
 * MUST be placed after requireAuth middleware to ensure req.supabase is available
 */
export const injectServices = (req: Request, res: Response, next: NextFunction) => {
  if (req.supabase) {
    res.locals.services = {
      board: new BoardService(req.supabase),
      list: new ListService(req.supabase),
      task: new TaskService(req.supabase),
      points: new PointsService(req.supabase),
      leaderboard: new LeaderboardService(req.supabase),
    };
  }
  next();
};
