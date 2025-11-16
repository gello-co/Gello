import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as pointsDb from "../../../ProjectSourceCode/src/lib/database/points.db.js";
import { LeaderboardService } from "../../../ProjectSourceCode/src/lib/services/leaderboard.service.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/points.db.js");

describe("LeaderboardService", () => {
  let service: LeaderboardService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new LeaderboardService(mockClient);
  });

  describe("getLeaderboard", () => {
    it("should get leaderboard with default limit", async () => {
      const mockLeaderboard = [
        { user_id: "user-1", total_points: 100, display_name: "User 1" },
        { user_id: "user-2", total_points: 50, display_name: "User 2" },
      ];
      vi.mocked(pointsDb.getLeaderboard).mockResolvedValue(
        mockLeaderboard as any,
      );

      const result = await service.getLeaderboard();

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 69);
      expect(result).toEqual(mockLeaderboard);
    });

    it("should get leaderboard with custom limit", async () => {
      const mockLeaderboard = [
        { user_id: "user-1", total_points: 100, display_name: "User 1" },
      ];
      vi.mocked(pointsDb.getLeaderboard).mockResolvedValue(
        mockLeaderboard as any,
      );

      const result = await service.getLeaderboard(10);

      expect(pointsDb.getLeaderboard).toHaveBeenCalledWith(mockClient, 10);
      expect(result).toEqual(mockLeaderboard);
    });
  });
});
