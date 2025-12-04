#!/usr/bin/env bun

import { createClient } from "@supabase/supabase-js";
import { hashSync } from "bcryptjs";
import { $ } from "bun";

// Get Supabase credentials from env or local instance
async function getSupabaseCredentials(): Promise<{
  url: string;
  serviceRoleKey: string;
}> {
  // Check env vars first (support both SUPABASE_ and SB_ prefixes)
  const url = process.env.SUPABASE_URL || process.env.SB_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SB_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    return { url, serviceRoleKey };
  }

  // Try to get from local Supabase instance
  console.log("📡 Getting credentials from local Supabase...");
  try {
    const result = await $`bunx supabase status -o env`.text();
    const lines = result.split("\n");

    let url = "";
    let serviceRoleKey = "";

    for (const line of lines) {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").replace(/^"|"$/g, "");

      if (key === "API_URL") {
        url = value;
      } else if (key === "SERVICE_ROLE_KEY") {
        serviceRoleKey = value;
      }
    }

    if (url && serviceRoleKey) {
      return { url, serviceRoleKey };
    }
  } catch {
    // Fall through to error
  }

  console.error("❌ Missing required environment variables:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("Either set these env vars or ensure local Supabase is running:");
  console.error("   bun run db:start");
  process.exit(1);
}

const { url: supabaseUrl, serviceRoleKey: supabaseServiceRoleKey } =
  await getSupabaseCredentials();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test users password (exported for test helpers)
export const SEEDED_USER_PASSWORD = "password123";

// Test users data
const testUsers = [
  {
    email: "admin@test.com",
    password: SEEDED_USER_PASSWORD,
    role: "admin" as const,
    name: "Admin User",
  },
  {
    email: "member@test.com",
    password: SEEDED_USER_PASSWORD,
    role: "member" as const,
    name: "Member User",
  },
];

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  role: string;
  team_id: string | null;
}

async function truncateAllTables(): Promise<void> {
  console.log("🗑️  Truncating all tables...");

  const tables = [
    "points_history",
    "tasks",
    "lists",
    "boards",
    "users",
    "teams",
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.warn(`⚠️  Warning truncating ${table}:`, error.message);
      }
    } catch (err) {
      console.warn(`⚠️  Warning truncating ${table}:`, err);
    }
  }
}

async function getOrCreateTeam(): Promise<{ id: string; name: string }> {
  console.log("🏢 Getting or creating test team...");

  // Check if team already exists
  const { data: existingTeam } = await supabase
    .from("teams")
    .select()
    .eq("name", "Test Team")
    .single();

  if (existingTeam) {
    console.log(`✅ Found existing team: ${existingTeam.name}`);
    return existingTeam;
  }

  // Create new team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name: "Test Team" })
    .select()
    .single();

  if (teamError) {
    console.error("❌ Error creating team:", teamError);
    throw teamError;
  }

  console.log(`✅ Created team: ${team.name}`);
  return team;
}

async function getOrCreateAuthUser(
  email: string,
  password: string
): Promise<string> {
  // Try to get existing auth user by listing users
  const { data: listData } = await supabase.auth.admin.listUsers();

  const existingAuthUser = listData?.users?.find((u) => u.email === email);

  if (existingAuthUser) {
    console.log(`ℹ️  Auth user ${email} already exists`);
    return existingAuthUser.id;
  }

  // Create new auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

  if (authError) {
    throw authError;
  }

  if (!authUser.user) {
    throw new Error(`Failed to create auth user for ${email}`);
  }

  console.log(`✅ Created auth user: ${email}`);
  return authUser.user.id;
}

async function createTestUsers(teamId: string): Promise<UserRecord[]> {
  console.log("👥 Creating test users...");
  const users: UserRecord[] = [];

  for (const userData of testUsers) {
    try {
      // Get or create auth user
      const authUserId = await getOrCreateAuthUser(
        userData.email,
        userData.password
      );

      // Check if public.users record exists
      const { data: existingUser } = await supabase
        .from("users")
        .select()
        .eq("id", authUserId)
        .single();

      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({
            display_name: userData.name,
            role: userData.role,
            team_id: teamId,
            total_points: 0,
          })
          .eq("id", authUserId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated user: ${userData.email} (${userData.role})`);
        users.push(updatedUser);
      } else {
        // Create new user record in public.users table
        const { data: user, error: userError } = await supabase
          .from("users")
          .insert({
            id: authUserId,
            email: userData.email,
            password_hash: hashSync(userData.password, 10),
            display_name: userData.name,
            role: userData.role,
            team_id: teamId,
            total_points: 0,
          })
          .select()
          .single();

        if (userError) {
          throw userError;
        }

        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        users.push(user);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
      throw error;
    }
  }

  return users;
}

async function createTestData(
  teamId: string,
  adminUserId: string,
  memberUserId: string
) {
  console.log("📋 Creating test boards, lists, and tasks...");

  // Create test board
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      name: "Demo Board",
      description: "A sample board for testing",
      team_id: teamId,
      created_by: adminUserId,
    })
    .select()
    .single();

  if (boardError) throw boardError;
  console.log(`✅ Created board: ${board.name}`);

  // Create lists
  const { data: lists, error: listsError } = await supabase
    .from("lists")
    .insert([
      { name: "To Do", position: 1, board_id: board.id },
      { name: "In Progress", position: 2, board_id: board.id },
      { name: "Done", position: 3, board_id: board.id },
    ])
    .select();

  if (listsError) throw listsError;
  console.log(`✅ Created ${lists.length} lists`);

  // Create sample tasks
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .insert([
      {
        title: "Set up project",
        description: "Initialize the project repository and dependencies",
        story_points: 3,
        position: 1,
        list_id: lists[0].id,
        assigned_to: adminUserId,
      },
      {
        title: "Create user interface",
        description: "Design and implement the main UI components",
        story_points: 5,
        position: 2,
        list_id: lists[0].id,
        assigned_to: memberUserId,
      },
      {
        title: "Write documentation",
        description: "Document the API and user guide",
        story_points: 2,
        position: 1,
        list_id: lists[1].id,
        assigned_to: memberUserId,
      },
    ])
    .select();

  if (tasksError) throw tasksError;
  console.log(`✅ Created ${tasks.length} tasks`);

  // Award some points for completed tasks (simulate completion)
  const { data: pointsHistory, error: pointsError } = await supabase
    .from("points_history")
    .insert([
      {
        user_id: adminUserId,
        points_earned: 5,
        reason: "task_complete",
        notes: "Completed project setup ahead of schedule",
      },
      {
        user_id: memberUserId,
        points_earned: 8,
        reason: "task_complete",
        notes: "Great work on UI implementation",
      },
    ])
    .select();

  if (pointsError) throw pointsError;
  console.log(`✅ Created ${pointsHistory.length} points history entries`);

  return { board, lists, tasks };
}

async function main() {
  try {
    console.log("🚀 Starting simplified seed process...");
    console.log(`📊 Target URL: ${supabaseUrl}`);

    // Step 1: Clear existing data
    await truncateAllTables();

    // Step 2: Create test users
    const team = await getOrCreateTeam();
    const users = await createTestUsers(team.id);

    if (users.length === 0) {
      throw new Error(
        "No users were created. Check if the script is running correctly."
      );
    }

    // Step 3: Create test data
    const adminUser = users.find((u) => u.role === "admin");
    const memberUser = users.find((u) => u.role === "member");

    if (!adminUser || !memberUser) {
      throw new Error(
        "Required users (admin, member) were not created successfully."
      );
    }

    await createTestData(team.id, adminUser.id, memberUser.id);

    console.log("");
    console.log("🎉 Seed completed successfully!");
    console.log("");
    console.log("Test accounts available:");
    console.log("  • admin@test.com / password123 (Admin)");
    console.log("  • member@test.com / password123 (Member)");
    console.log("");
    console.log("You can now login and test the application functionality.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run the seed script
if (import.meta.main) {
  main();
}
