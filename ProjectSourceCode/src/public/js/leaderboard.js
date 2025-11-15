/**
 * Leaderboard JavaScript
 * Fetches and updates leaderboard data for real-time updates
 *
 * Note: The leaderboard is initially rendered server-side.
 * This script only updates it for real-time polling/SSE scenarios.
 */

async function updateLeaderboard() {
  try {
    const response = await fetch("/api/points/leaderboard", {
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Failed to fetch leaderboard");
      return;
    }

    const leaderboard = await response.json();
    const tbody = document.getElementById("leaderboardBody");

    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = "";

    // Add new rows with proper formatting
    leaderboard.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
				<td>${entry.rank || ""}</td>
				<td>
					<div class="d-flex align-items-center">
						<span class="ms-2">${entry.display_name || "Unknown"}</span>
					</div>
				</td>
				<td>${entry.total_points || 0}</td>
			`;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error updating leaderboard:", error);
  }
}

// Set up polling for real-time updates (every 30 seconds)
// This will refresh the leaderboard periodically
// The initial server-rendered content will be replaced after the first update
setInterval(updateLeaderboard, 30000);
