import express from "express";
import { LeaderboardService } from "../../lib/services/leaderboard.service.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

function getLeaderboardService() {
  return new LeaderboardService(getSupabaseClient());
}

const clients = new Set<express.Response>();

router.get("/leaderboard", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  clients.add(res);

  const sendUpdate = async () => {
    try {
      const leaderboard = await getLeaderboardService().getLeaderboard(100);
      res.write(`data: ${JSON.stringify(leaderboard)}\n\n`);
    } catch (error) {
      console.error("Error sending SSE update:", error);
      clients.delete(res);
      res.end();
    }
  };

  sendUpdate();

  const interval = setInterval(() => {
    if (!clients.has(res)) {
      clearInterval(interval);
      return;
    }
    sendUpdate();
  }, 5000);

  req.on("close", () => {
    clearInterval(interval);
    clients.delete(res);
  });
});

export function broadcastLeaderboardUpdate() {
  const message = JSON.stringify({
    type: "leaderboard_update",
    timestamp: Date.now(),
  });
  clients.forEach((client) => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      clients.delete(client);
    }
  });
}

export default router;
