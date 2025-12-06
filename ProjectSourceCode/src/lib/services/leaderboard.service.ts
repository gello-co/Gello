import type { SupabaseClient } from '@supabase/supabase-js';
import { getLeaderboard, type LeaderboardEntry } from '../../db/points.db.ts';

export class LeaderboardService {
  constructor(private client: SupabaseClient) {}

  async getLeaderboard(limit: number = 10): Promise<Array<LeaderboardEntry>> {
    return getLeaderboard(this.client, limit);
  }
}