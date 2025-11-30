import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLeaderboard,
  type LeaderboardEntry,
} from "../db/points.db.js";

export class LeaderboardService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    return getLeaderboard(this.client, limit);
  }
}
