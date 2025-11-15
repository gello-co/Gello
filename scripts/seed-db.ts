#!/usr/bin/env bun

/**
 * Database Seeding Script
 *
 * Seeds the database with test data using the service layer.
 * Supports local Supabase (prioritizes SUPABASE_LOCAL_* env vars).
 *
 * Usage:
 *   bun run scripts/seed-db.ts
 *
 * Environment Variables (in priority order):
 *   - SUPABASE_LOCAL_URL, SUPABASE_LOCAL_SERVICE_ROLE_KEY (local Supabase)
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (remote Supabase)
 *
 * This script is idempotent - it checks if data exists before creating.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { $ } from "bun";
// Don't import services or env here - load them after setting local env vars in main()
// This ensures env.ts picks up the correct values

// Load local Supabase environment variables if not already set
async function loadLocalEnv() {
  // Always load local Supabase env vars first (they take priority over doppler)
  // This ensures we use local Supabase even if doppler has remote Supabase config
  try {
    const result = await $`bunx supabase status -o env`.quiet();
    const envOutput = result.stdout.toString();

    for (const line of envOutput.split("\n")) {
      // Handle both KEY="value" and KEY=value formats
      const match = line.match(/^([A-Z_]+)=(?:"([^"]+)"|([^" \n]+))$/);
      if (match) {
        const [, key, quotedValue, unquotedValue] = match;
        const value = quotedValue || unquotedValue;
        if (key && value) {
          // Map to expected environment variable names
          // Always set local vars (they take priority in env.ts)
          if (key === "API_URL") {
            // Always set SUPABASE_LOCAL_URL (takes priority in env.ts pick() function)
            process.env.SUPABASE_LOCAL_URL = value;
            // Force set SUPABASE_URL to local API URL (overrides doppler's postgres URL)
            process.env.SUPABASE_URL = value;
          } else if (key === "PUBLISHABLE_KEY") {
            process.env.SUPABASE_LOCAL_ANON_KEY = value;
            process.env.SUPABASE_PUBLISHABLE_KEY = value;
          } else if (key === "SECRET_KEY") {
            process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = value;
            process.env.SUPABASE_SERVICE_ROLE_KEY = value;
          } else if (
            key === "ANON_KEY" &&
            !process.env.SUPABASE_LOCAL_ANON_KEY
          ) {
            process.env.SUPABASE_LOCAL_ANON_KEY = value;
            process.env.SUPABASE_PUBLISHABLE_KEY = value;
          } else if (
            key === "SERVICE_ROLE_KEY" &&
            !process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
          ) {
            process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = value;
            process.env.SUPABASE_SERVICE_ROLE_KEY = value;
          } else {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    console.warn(
      "⚠️  Could not load local Supabase environment variables:",
      error,
    );
    console.warn("   Make sure Supabase is running: bun run supabase:start");
  }
}

// Services imported dynamically in main() after setting env vars

type SeedUser = {
  email: string;
  password: string;
  display_name: string;
  role: "admin" | "manager" | "member";
  teamName?: string;
  total_points?: number;
};

type SeedTeam = {
  name: string;
};

type SeedBoard = {
  name: string;
  description: string;
  teamName: string;
  createdByEmail: string;
};

type SeedList = {
  name: string;
  position: number;
  boardName: string;
  teamName: string;
};

type SeedTask = {
  title: string;
  description: string;
  story_points: number;
  listName: string;
  boardName: string;
  teamName: string;
  assignedToEmail?: string;
  due_date?: Date;
  completed_at?: Date;
};

type SeedPoints = {
  userEmail: string;
  points_earned: number;
  reason: "task_complete" | "manual_award";
  taskTitle?: string;
  awardedByEmail: string;
  notes?: string;
};

// Seed data definitions
const SEED_USERS: SeedUser[] = [
  {
    email: "admin@example.com",
    password: "password123",
    display_name: "Ada Admin",
    role: "admin",
    teamName: "Alpha Team",
    total_points: 25,
  },
  {
    email: "manager@example.com",
    password: "password123",
    display_name: "Alice Manager",
    role: "manager",
    teamName: "Alpha Team",
    total_points: 18,
  },
  {
    email: "bob.manager@example.com",
    password: "password123",
    display_name: "Bob Manager",
    role: "manager",
    teamName: "Beta Team",
    total_points: 10,
  },
  {
    email: "member@example.com",
    password: "password123",
    display_name: "Ivy Member",
    role: "member",
    teamName: "Alpha Team",
    total_points: 12,
  },
  {
    email: "noah.member@example.com",
    password: "password123",
    display_name: "Noah Member",
    role: "member",
    teamName: "Alpha Team",
    total_points: 8,
  },
];

const SEED_TEAMS: SeedTeam[] = [{ name: "Alpha Team" }, { name: "Beta Team" }];

const SEED_BOARDS: SeedBoard[] = [
  {
    name: "Product Roadmap",
    description: "High-level roadmap for the next two quarters.",
    teamName: "Alpha Team",
    createdByEmail: "admin@example.com",
  },
  {
    name: "Sprint 47",
    description: "Current sprint backlog and progress.",
    teamName: "Alpha Team",
    createdByEmail: "manager@example.com",
  },
  {
    name: "Growth Experiments",
    description: "Testing backlog for acquisition ideas.",
    teamName: "Alpha Team",
    createdByEmail: "manager@example.com",
  },
];

const SEED_LISTS: SeedList[] = [
  // Product Roadmap lists
  {
    name: "Ideas",
    position: 1,
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
  },
  {
    name: "In Build",
    position: 2,
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
  },
  {
    name: "Launch",
    position: 3,
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
  },
  // Sprint 47 lists
  {
    name: "To Do",
    position: 1,
    boardName: "Sprint 47",
    teamName: "Alpha Team",
  },
  {
    name: "In Progress",
    position: 2,
    boardName: "Sprint 47",
    teamName: "Alpha Team",
  },
  { name: "Done", position: 3, boardName: "Sprint 47", teamName: "Alpha Team" },
  // Growth Experiments lists
  {
    name: "Backlog",
    position: 1,
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
  },
  {
    name: "Running",
    position: 2,
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
  },
  {
    name: "Results",
    position: 3,
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
  },
];

const SEED_TASKS: SeedTask[] = [
  {
    title: "Collaborative whiteboard",
    description:
      "Enable real-time whiteboarding inside team board detail view.",
    story_points: 8,
    listName: "Ideas",
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
    assignedToEmail: "manager@example.com",
    due_date: new Date(Date.now() + 21 * 86_400_000),
  },
  {
    title: "Mobile offline mode",
    description: "Investigate caching options to support task editing offline.",
    story_points: 13,
    listName: "In Build",
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
    assignedToEmail: "member@example.com",
    due_date: new Date(Date.now() + 28 * 86_400_000),
  },
  {
    title: "Public release checklist",
    description: "Finalize messaging, legal review, and support documentation.",
    story_points: 5,
    listName: "Launch",
    boardName: "Product Roadmap",
    teamName: "Alpha Team",
    assignedToEmail: "admin@example.com",
    completed_at: new Date(Date.now() - 2 * 86_400_000),
  },
  {
    title: "Refine onboarding tooltips",
    description: "Copy updates for the quickstart flow.",
    story_points: 3,
    listName: "To Do",
    boardName: "Sprint 47",
    teamName: "Alpha Team",
    assignedToEmail: "noah.member@example.com",
  },
  {
    title: "Improve task drag performance",
    description: "Debounce position updates and add optimistic UI.",
    story_points: 5,
    listName: "In Progress",
    boardName: "Sprint 47",
    teamName: "Alpha Team",
    assignedToEmail: "member@example.com",
  },
  {
    title: "Leaderboard SSE prototype",
    description: "Initial server-sent events broadcast implementation.",
    story_points: 8,
    listName: "Done",
    boardName: "Sprint 47",
    teamName: "Alpha Team",
    assignedToEmail: "manager@example.com",
    completed_at: new Date(Date.now() - 1 * 86_400_000),
  },
  {
    title: "Weekly newsletter CTA",
    description: "Experiment with contextual upsell in dashboard header.",
    story_points: 2,
    listName: "Backlog",
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
    assignedToEmail: "noah.member@example.com",
  },
  {
    title: "Referral flow refresh",
    description: "Introduce milestone-based rewards to referrals program.",
    story_points: 3,
    listName: "Running",
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
    assignedToEmail: "member@example.com",
  },
  {
    title: "Activation email experiment",
    description: "Variant B lifted activation by 8%. Rollout to 100%.",
    story_points: 1,
    listName: "Results",
    boardName: "Growth Experiments",
    teamName: "Alpha Team",
    assignedToEmail: "manager@example.com",
    completed_at: new Date(Date.now() - 5 * 86_400_000),
  },
];

const SEED_POINTS: SeedPoints[] = [
  {
    userEmail: "manager@example.com",
    points_earned: 8,
    reason: "task_complete",
    taskTitle: "Leaderboard SSE prototype",
    awardedByEmail: "manager@example.com",
    notes: "Sprint 47 completed task",
  },
  {
    userEmail: "manager@example.com",
    points_earned: 1,
    reason: "manual_award",
    awardedByEmail: "admin@example.com",
    notes: "Recognition for mentoring new members",
  },
  {
    userEmail: "member@example.com",
    points_earned: 5,
    reason: "task_complete",
    taskTitle: "Mobile offline mode",
    awardedByEmail: "manager@example.com",
    notes: "Delivered ahead of schedule",
  },
  {
    userEmail: "noah.member@example.com",
    points_earned: 3,
    reason: "manual_award",
    awardedByEmail: "manager@example.com",
    notes: "Great feedback",
  },
];

// Helper functions (getServiceRoleClient removed - using direct createClient in main)

async function findUserByEmail(
  client: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const { data } = await client
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();
  return data || null;
}

async function findTeamByName(
  client: SupabaseClient,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await client
    .from("teams")
    .select("id, name")
    .eq("name", name)
    .single();
  return data || null;
}

async function findBoardByName(
  client: SupabaseClient,
  name: string,
  teamId: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await client
    .from("boards")
    .select("id, name")
    .eq("name", name)
    .eq("team_id", teamId)
    .single();
  return data || null;
}

async function findListByName(
  client: SupabaseClient,
  name: string,
  boardId: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await client
    .from("lists")
    .select("id, name")
    .eq("name", name)
    .eq("board_id", boardId)
    .single();
  return data || null;
}

async function findTaskByTitle(
  client: SupabaseClient,
  title: string,
  listId: string,
): Promise<{ id: string; title: string } | null> {
  const { data } = await client
    .from("tasks")
    .select("id, title")
    .eq("title", title)
    .eq("list_id", listId)
    .single();
  return data || null;
}

async function main() {
  // Load local environment variables first (before importing env)
  // This ensures local Supabase vars take priority over doppler
  await loadLocalEnv();

  // Debug: Check what env vars are set
  console.info("🔍 Environment check:");
  console.info(
    `  SUPABASE_LOCAL_URL: ${process.env.SUPABASE_LOCAL_URL || "NOT SET"}`,
  );
  console.info(`  SUPABASE_URL: ${process.env.SUPABASE_URL || "NOT SET"}`);
  console.info(
    `  SUPABASE_LOCAL_SERVICE_ROLE_KEY: ${process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ? "SET" : "NOT SET"}`,
  );

  // Use process.env directly to avoid env.ts module caching issues
  // env.ts pick() function reads at module evaluation time, which may be before we set local vars
  const supabaseUrl =
    process.env.SUPABASE_LOCAL_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.info("🌱 Starting database seeding...");
  console.info(`📍 Supabase URL: ${supabaseUrl || "NOT SET"}`);

  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    // Verify we're using the local HTTP URL (not postgres connection string)
    throw new Error(
      `Invalid Supabase URL: ${supabaseUrl}. Expected HTTP URL (http://...). ` +
        `Make sure local Supabase is running: bun run supabase:start`,
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. " +
        "Ensure local Supabase is running: bun run supabase:start",
    );
  }

  // Ensure env.ts will pick up the correct values by setting process.env
  // env.ts checks SUPABASE_LOCAL_URL first, so set that (not just SUPABASE_URL)
  // This must be done BEFORE importing services that use env.ts
  process.env.SUPABASE_LOCAL_URL = supabaseUrl;
  process.env.SUPABASE_URL = supabaseUrl; // Also set for compatibility
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = supabaseServiceRoleKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey; // Also set for compatibility

  // NOW import services after setting env vars (so env.ts picks up correct values)
  const { AuthService } = await import(
    "../ProjectSourceCode/src/lib/services/auth.service.js"
  );
  const { BoardService } = await import(
    "../ProjectSourceCode/src/lib/services/board.service.js"
  );
  const { ListService } = await import(
    "../ProjectSourceCode/src/lib/services/list.service.js"
  );
  const { PointsService } = await import(
    "../ProjectSourceCode/src/lib/services/points.service.js"
  );
  const { TaskService } = await import(
    "../ProjectSourceCode/src/lib/services/task.service.js"
  );
  const { TeamService } = await import(
    "../ProjectSourceCode/src/lib/services/team.service.js"
  );

  // Create service client directly with verified values
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    },
  });

  // Create service instances (AuthService.getServiceRoleClient() will now use correct env values)
  const authService = new AuthService(serviceClient);
  const teamService = new TeamService(serviceClient);
  const boardService = new BoardService(serviceClient);
  const listService = new ListService(serviceClient);
  const taskService = new TaskService(serviceClient);
  const pointsService = new PointsService(serviceClient);

  // Track created entities for later use
  const userMap = new Map<string, { id: string; email: string }>();
  const teamMap = new Map<string, { id: string; name: string }>();
  const boardMap = new Map<string, { id: string; name: string }>();
  const listMap = new Map<string, { id: string; name: string }>();
  const taskMap = new Map<string, { id: string; title: string }>();

  // 1. Create teams
  console.info("🏗️  Creating teams...");
  for (const seedTeam of SEED_TEAMS) {
    let team = await findTeamByName(serviceClient, seedTeam.name);
    if (!team) {
      const created = await teamService.createTeam({ name: seedTeam.name });
      team = { id: created.id, name: created.name };
      console.info(`  ✅ Created team: ${team.name}`);
    } else {
      console.info(`  ⏭️  Team already exists: ${team.name}`);
    }
    teamMap.set(seedTeam.name, team);
  }

  // 2. Create users
  console.info("👥 Creating users...");
  for (const seedUser of SEED_USERS) {
    let user = await findUserByEmail(serviceClient, seedUser.email);
    if (!user) {
      try {
        const team = seedUser.teamName
          ? teamMap.get(seedUser.teamName)
          : undefined;
        const created = await authService.register({
          email: seedUser.email,
          password: seedUser.password,
          display_name: seedUser.display_name,
          role: seedUser.role,
          team_id: team?.id,
        });
        user = { id: created.user.id, email: created.user.email };
        console.info(`  ✅ Created user: ${user.email} (${seedUser.role})`);
      } catch (error: any) {
        // User already exists in auth - find them in users table
        if (
          error.name === "DuplicateUserError" ||
          error.message?.includes("already exists")
        ) {
          // Try to find user again (might have been created by another process)
          const existing = await findUserByEmail(serviceClient, seedUser.email);
          if (existing) {
            user = existing;
            console.info(
              `  ⏭️  User already exists: ${user.email} (${seedUser.role})`,
            );
          } else {
            // User exists in auth but not in users table - sync from auth.users
            console.info(
              `  🔄 User ${seedUser.email} exists in auth, syncing to users table...`,
            );
            try {
              // Use Supabase auth admin API to safely get user by email (no SQL injection risk)
              const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserByEmail(seedUser.email);
              
              if (authError || !authUser) {
                console.warn(
                  `  ⚠️  Could not find user ${seedUser.email} in auth.users - skipping`,
                );
                continue;
              }
              const team = seedUser.teamName
                ? teamMap.get(seedUser.teamName)
                : undefined;
              
              // Create users table record with auth user's ID
              const { data: newUser, error: insertError } = await serviceClient
                .from("users")
                .insert({
                  id: authUser.user.id,
                  email: authUser.user.email,
                  password_hash: "",
                  display_name: seedUser.display_name,
                  role: seedUser.role,
                  team_id: team?.id ?? null,
                  avatar_url: null,
                  total_points: seedUser.total_points ?? 0,
                })
                .select("id, email")
                .single();
              
              if (insertError) {
                console.error(
                  `  ❌ Failed to create users table record: ${insertError.message}`,
                );
                continue;
              }
              
              if (newUser) {
                user = newUser;
                console.info(
                  `  ✅ Synced user from auth: ${user.email} (${seedUser.role})`,
                );
              }
            } catch (syncError: any) {
              console.error(
                `  ❌ Failed to sync user ${seedUser.email}: ${syncError.message}`,
              );
              continue;
            }
          }
        } else {
          console.error(`  ❌ Failed to create user ${seedUser.email}:`, error);
          throw error;
        }
      }
    } else {
      console.info(
        `  ⏭️  User already exists: ${user.email} (${seedUser.role})`,
      );
    }

    if (seedUser.total_points !== undefined && user) {
      // Update total_points if specified
      await serviceClient
        .from("users")
        .update({ total_points: seedUser.total_points })
        .eq("id", user.id);
    }
    userMap.set(seedUser.email, user);
  }

  // 3. Create boards
  console.info("🗂️  Creating boards...");
  for (const seedBoard of SEED_BOARDS) {
    const team = teamMap.get(seedBoard.teamName);
    if (!team) {
      throw new Error(`Team not found: ${seedBoard.teamName}`);
    }
    const creator = userMap.get(seedBoard.createdByEmail);
    if (!creator) {
      throw new Error(`Creator not found: ${seedBoard.createdByEmail}`);
    }

    let board = await findBoardByName(serviceClient, seedBoard.name, team.id);
    if (!board) {
      const created = await boardService.createBoard({
        name: seedBoard.name,
        description: seedBoard.description,
        team_id: team.id,
        created_by: creator.id,
      });
      board = { id: created.id, name: created.name };
      console.info(`  ✅ Created board: ${board.name}`);
    } else {
      console.info(`  ⏭️  Board already exists: ${board.name}`);
    }
    boardMap.set(`${seedBoard.teamName}:${seedBoard.name}`, board);
  }

  // 4. Create lists
  console.info("📋 Creating lists...");
  for (const seedList of SEED_LISTS) {
    const boardKey = `${seedList.teamName}:${seedList.boardName}`;
    const board = boardMap.get(boardKey);
    if (!board) {
      throw new Error(`Board not found: ${boardKey}`);
    }

    let list = await findListByName(serviceClient, seedList.name, board.id);
    if (!list) {
      const created = await listService.createList({
        board_id: board.id,
        name: seedList.name,
        position: seedList.position,
      });
      list = { id: created.id, name: created.name };
      console.info(`  ✅ Created list: ${list.name} (${seedList.boardName})`);
    } else {
      console.info(`  ⏭️  List already exists: ${list.name}`);
    }
    listMap.set(`${boardKey}:${seedList.name}`, list);
  }

  // 5. Create tasks
  console.info("✅ Creating tasks...");
  for (const seedTask of SEED_TASKS) {
    const listKey = `${seedTask.teamName}:${seedTask.boardName}:${seedTask.listName}`;
    const list = listMap.get(listKey);
    if (!list) {
      throw new Error(`List not found: ${listKey}`);
    }

    let task = await findTaskByTitle(serviceClient, seedTask.title, list.id);
    if (!task) {
      const assignee = seedTask.assignedToEmail
        ? userMap.get(seedTask.assignedToEmail)
        : undefined;

      // Get current max position in list
      const { data: existingTasks } = await serviceClient
        .from("tasks")
        .select("position")
        .eq("list_id", list.id)
        .order("position", { ascending: false })
        .limit(1);
      const position =
        existingTasks && existingTasks.length > 0
          ? existingTasks[0]!.position + 1
          : 1;

      const created = await taskService.createTask({
        list_id: list.id,
        title: seedTask.title,
        description: seedTask.description,
        story_points: seedTask.story_points,
        assigned_to: assignee?.id,
        position,
        due_date: seedTask.due_date?.toISOString(),
      });

      // Mark as completed if specified
      if (seedTask.completed_at) {
        await taskService.completeTask(created.id);
      }

      task = { id: created.id, title: created.title };
      console.info(`  ✅ Created task: ${task.title}`);
    } else {
      console.info(`  ⏭️  Task already exists: ${task.title}`);
    }
    taskMap.set(`${listKey}:${seedTask.title}`, task);
  }

  // 6. Create points history
  console.info("📈 Creating points history...");
  for (const seedPoints of SEED_POINTS) {
    const user = userMap.get(seedPoints.userEmail);
    if (!user) {
      throw new Error(`User not found: ${seedPoints.userEmail}`);
    }
    const awardedBy = userMap.get(seedPoints.awardedByEmail);
    if (!awardedBy) {
      throw new Error(`Awarder not found: ${seedPoints.awardedByEmail}`);
    }

    let taskId: string | undefined;
    if (seedPoints.taskTitle) {
      // Find task by title (may be in any list)
      const { data: tasks } = await serviceClient
        .from("tasks")
        .select("id")
        .eq("title", seedPoints.taskTitle)
        .limit(1);
      taskId = tasks?.[0]?.id;
    }

    // Check if points history already exists
    const { data: existing } = await serviceClient
      .from("points_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("points_earned", seedPoints.points_earned)
      .eq("reason", seedPoints.reason)
      .eq("awarded_by", awardedBy.id)
      .limit(1);

    if (!existing || existing.length === 0) {
      if (seedPoints.reason === "task_complete" && taskId) {
        // Use task completion points (but task is already completed, so we'll create manually)
        // Since the task is already completed, we need to manually create the points history
        // to match the expected points amount
        await serviceClient.from("points_history").insert({
          user_id: user.id,
          points_earned: seedPoints.points_earned,
          reason: seedPoints.reason,
          task_id: taskId,
          awarded_by: awardedBy.id,
          notes: seedPoints.notes ?? null,
        });
        console.info(
          `  ✅ Awarded ${seedPoints.points_earned} points to ${user.email} (task completion)`,
        );
      } else {
        // Manual award
        await pointsService.awardManualPoints(
          {
            user_id: user.id,
            points_earned: seedPoints.points_earned,
            notes: seedPoints.notes,
          },
          awardedBy.id,
        );
        console.info(
          `  ✅ Awarded ${seedPoints.points_earned} points to ${user.email} (manual)`,
        );
      }
    } else {
      console.info(`  ⏭️  Points already awarded to ${user.email}`);
    }
  }

  console.info("🌱 Database seeding completed successfully!");
  console.info(`\n📊 Summary:`);
  console.info(`  - Teams: ${teamMap.size}`);
  console.info(`  - Users: ${userMap.size}`);
  console.info(`  - Boards: ${boardMap.size}`);
  console.info(`  - Lists: ${listMap.size}`);
  console.info(`  - Tasks: ${taskMap.size}`);
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
