#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SeedContext = {
  supabaseUrl: string;
  serviceKey: string;
};

function pickEnv(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (candidate && candidate.length > 0) return candidate;
  }
  return undefined;
}

function resolveContext(): SeedContext {
  const supabaseUrl = pickEnv(
    process.env.APP_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.BUN_PUBLIC_SUPABASE_URL,
    process.env.SB_URL,
    process.env.PUBLIC_SUPABASE_URL,
  );
  const serviceKey = pickEnv(
    process.env.APP_SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SB_SERVICE_ROLE_KEY,
    process.env.SERVICE_ROLE_KEY,
  );
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL (see scripts/seed-db.ts)");
  }
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (see scripts/seed-db.ts)",
    );
  }
  return { supabaseUrl, serviceKey };
}

async function clearTable(client: SupabaseClient, table: string) {
  const { error } = await client
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

async function main() {
  const { supabaseUrl, serviceKey } = resolveContext();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "scripts/seed-db.ts" } },
  });

  console.info("🧹 Clearing existing data…");
  const tables = [
    "points_history",
    "tasks",
    "lists",
    "boards",
    "users",
    "teams",
  ];
  for (const table of tables) {
    await clearTable(supabase, table);
  }

  const teamAlphaId = randomUUID();
  const teamBetaId = randomUUID();

  console.info("🏗️ Inserting teams…");
  {
    const { error } = await supabase.from("teams").insert([
      { id: teamAlphaId, name: "Alpha Team" },
      { id: teamBetaId, name: "Beta Team" },
    ]);
    if (error) throw new Error(`Failed to insert teams: ${error.message}`);
  }

  const adminId = randomUUID();
  const managerAliceId = randomUUID();
  const managerBobId = randomUUID();
  const memberIvyId = randomUUID();
  const memberNoahId = randomUUID();

  console.info("👥 Inserting users…");
  {
    const users = [
      {
        id: adminId,
        email: "ada.admin@example.com",
        password_hash: "argon2$fixture-admin",
        display_name: "Ada Admin",
        role: "admin",
        team_id: teamAlphaId,
        total_points: 25,
        avatar_url: null,
      },
      {
        id: managerAliceId,
        email: "alice.manager@example.com",
        password_hash: "argon2$fixture-manager",
        display_name: "Alice Manager",
        role: "manager",
        team_id: teamAlphaId,
        total_points: 18,
        avatar_url: null,
      },
      {
        id: managerBobId,
        email: "bob.manager@example.com",
        password_hash: "argon2$fixture-manager",
        display_name: "Bob Manager",
        role: "manager",
        team_id: teamBetaId,
        total_points: 10,
        avatar_url: null,
      },
      {
        id: memberIvyId,
        email: "ivy.member@example.com",
        password_hash: "argon2$fixture-member",
        display_name: "Ivy Member",
        role: "member",
        team_id: teamAlphaId,
        total_points: 12,
        avatar_url: null,
      },
      {
        id: memberNoahId,
        email: "noah.member@example.com",
        password_hash: "argon2$fixture-member",
        display_name: "Noah Member",
        role: "member",
        team_id: teamAlphaId,
        total_points: 8,
        avatar_url: null,
      },
    ];
    const { error } = await supabase.from("users").insert(users);
    if (error) throw new Error(`Failed to insert users: ${error.message}`);
  }

  const boardRoadmapId = randomUUID();
  const boardSprintId = randomUUID();
  const boardGrowthId = randomUUID();

  console.info("🗂️ Inserting boards…");
  {
    const boards = [
      {
        id: boardRoadmapId,
        name: "Product Roadmap",
        description: "High-level roadmap for the next two quarters.",
        team_id: teamAlphaId,
        created_by: adminId,
      },
      {
        id: boardSprintId,
        name: "Sprint 47",
        description: "Current sprint backlog and progress.",
        team_id: teamAlphaId,
        created_by: managerAliceId,
      },
      {
        id: boardGrowthId,
        name: "Growth Experiments",
        description: "Testing backlog for acquisition ideas.",
        team_id: teamAlphaId,
        created_by: managerAliceId,
      },
    ];
    const { error } = await supabase.from("boards").insert(boards);
    if (error) throw new Error(`Failed to insert boards: ${error.message}`);
  }

  console.info("📋 Inserting lists…");
  const listRoadmapIdeasId = randomUUID();
  const listRoadmapBuildId = randomUUID();
  const listRoadmapLaunchId = randomUUID();
  const listSprintTodoId = randomUUID();
  const listSprintProgressId = randomUUID();
  const listSprintDoneId = randomUUID();
  const listGrowthBacklogId = randomUUID();
  const listGrowthRunningId = randomUUID();
  const listGrowthResultsId = randomUUID();
  {
    const lists = [
      {
        id: listRoadmapIdeasId,
        board_id: boardRoadmapId,
        name: "Ideas",
        position: 1,
      },
      {
        id: listRoadmapBuildId,
        board_id: boardRoadmapId,
        name: "In Build",
        position: 2,
      },
      {
        id: listRoadmapLaunchId,
        board_id: boardRoadmapId,
        name: "Launch",
        position: 3,
      },
      {
        id: listSprintTodoId,
        board_id: boardSprintId,
        name: "To Do",
        position: 1,
      },
      {
        id: listSprintProgressId,
        board_id: boardSprintId,
        name: "In Progress",
        position: 2,
      },
      {
        id: listSprintDoneId,
        board_id: boardSprintId,
        name: "Done",
        position: 3,
      },
      {
        id: listGrowthBacklogId,
        board_id: boardGrowthId,
        name: "Backlog",
        position: 1,
      },
      {
        id: listGrowthRunningId,
        board_id: boardGrowthId,
        name: "Running",
        position: 2,
      },
      {
        id: listGrowthResultsId,
        board_id: boardGrowthId,
        name: "Results",
        position: 3,
      },
    ];
    const { error } = await supabase.from("lists").insert(lists);
    if (error) throw new Error(`Failed to insert lists: ${error.message}`);
  }

  console.info("✅ Inserting tasks…");
  const now = new Date();
  const iso = (offsetDays: number) =>
    new Date(now.getTime() + offsetDays * 86_400_000).toISOString();

  const tasks = [
    {
      id: randomUUID(),
      list_id: listRoadmapIdeasId,
      title: "Collaborative whiteboard",
      description:
        "Enable real-time whiteboarding inside team board detail view.",
      story_points: 8,
      assigned_to: managerAliceId,
      position: 1,
      due_date: iso(21),
    },
    {
      id: randomUUID(),
      list_id: listRoadmapBuildId,
      title: "Mobile offline mode",
      description:
        "Investigate caching options to support task editing offline.",
      story_points: 13,
      assigned_to: memberIvyId,
      position: 1,
      due_date: iso(28),
    },
    {
      id: randomUUID(),
      list_id: listRoadmapLaunchId,
      title: "Public release checklist",
      description:
        "Finalize messaging, legal review, and support documentation.",
      story_points: 5,
      assigned_to: adminId,
      position: 1,
      completed_at: iso(-2),
    },
    {
      id: randomUUID(),
      list_id: listSprintTodoId,
      title: "Refine onboarding tooltips",
      description: "Copy updates for the quickstart flow.",
      story_points: 3,
      assigned_to: memberNoahId,
      position: 1,
    },
    {
      id: randomUUID(),
      list_id: listSprintProgressId,
      title: "Improve task drag performance",
      description: "Debounce position updates and add optimistic UI.",
      story_points: 5,
      assigned_to: memberIvyId,
      position: 1,
    },
    {
      id: randomUUID(),
      list_id: listSprintDoneId,
      title: "Leaderboard SSE prototype",
      description: "Initial server-sent events broadcast implementation.",
      story_points: 8,
      assigned_to: managerAliceId,
      position: 1,
      completed_at: iso(-1),
    },
    {
      id: randomUUID(),
      list_id: listGrowthBacklogId,
      title: "Weekly newsletter CTA",
      description: "Experiment with contextual upsell in dashboard header.",
      story_points: 2,
      assigned_to: memberNoahId,
      position: 1,
    },
    {
      id: randomUUID(),
      list_id: listGrowthRunningId,
      title: "Referral flow refresh",
      description: "Introduce milestone-based rewards to referrals program.",
      story_points: 3,
      assigned_to: memberIvyId,
      position: 1,
    },
    {
      id: randomUUID(),
      list_id: listGrowthResultsId,
      title: "Activation email experiment",
      description: "Variant B lifted activation by 8%. Rollout to 100%.",
      story_points: 1,
      assigned_to: managerAliceId,
      position: 1,
      completed_at: iso(-5),
    },
  ];

  {
    const { error } = await supabase.from("tasks").insert(tasks);
    if (error) throw new Error(`Failed to insert tasks: ${error.message}`);
  }

  console.info("📈 Inserting point history…");
  {
    const pointEvents = [
      {
        id: randomUUID(),
        user_id: managerAliceId,
        points_earned: 8,
        reason: "task_complete",
        task_id: tasks[5]!.id,
        awarded_by: managerAliceId,
        notes: "Sprint 47 completed task",
      },
      {
        id: randomUUID(),
        user_id: managerAliceId,
        points_earned: 1,
        reason: "manual_award",
        awarded_by: adminId,
        notes: "Recognition for mentoring new members",
      },
      {
        id: randomUUID(),
        user_id: memberIvyId,
        points_earned: 5,
        reason: "task_complete",
        task_id: tasks[1]!.id,
        awarded_by: managerAliceId,
        notes: "Delivered ahead of schedule",
      },
      {
        id: randomUUID(),
        user_id: memberNoahId,
        points_earned: 3,
        reason: "manual_award",
        awarded_by: managerAliceId,
        notes: "Great feedback",
      },
    ];
    const { error } = await supabase.from("points_history").insert(pointEvents);
    if (error) {
      throw new Error(`Failed to insert points history: ${error.message}`);
    }
  }

  console.info("🌱 Seed data inserted successfully.");
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
