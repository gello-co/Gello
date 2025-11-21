#!/usr/bin/env bun

import { createClient } from "@supabase/supabase-js";
import { hashSync } from "bcryptjs";

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

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
  name: string;
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
    "user_context",
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

async function createTestUsers(): Promise<UserRecord[]> {
  console.log("👥 Creating test users...");
  const users: UserRecord[] = [];

  // Create test team first
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

  for (const userData of testUsers) {
    try {
      // Create auth user
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

      if (authError) {
        // If user already exists, try to get the existing user
        if (authError.message.includes("already been registered")) {
          console.log(
            `ℹ️  User ${userData.email} already exists, skipping creation`,
          );
          continue;
        }
        throw authError;
      }

      if (!authUser.user) {
        throw new Error(`Failed to create auth user for ${userData.email}`);
      }

      // Create user record in public.users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id,
          email: userData.email,
          password_hash: hashSync(userData.password, 10), // Use cost 10 for compatibility
          display_name: userData.name,
          role: userData.role,
          team_id: team.id,
          total_points: 0,
        })
        .select()
        .single();

      if (userError) {
        // If user already exists in public.users, try to update instead
        if (userError.message.includes("duplicate key value")) {
          console.log(
            `ℹ️  User ${userData.email} already exists in public.users, updating...`,
          );
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
              display_name: userData.name,
              role: userData.role,
              team_id: team.id,
            })
            .eq("email", userData.email)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          users.push(updatedUser);
        } else {
          throw userError;
        }
      } else {
        users.push(user);
      }

      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
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
  memberUserId: string,
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
    const users = await createTestUsers();

    if (users.length === 0) {
      throw new Error(
        "No users were created. Check if the script is running correctly.",
      );
    }

    // Step 3: Create test data
    const adminUser = users.find((u) => u.role === "admin");
    const memberUser = users.find((u) => u.role === "member");

    if (!adminUser || !memberUser) {
      throw new Error(
        "Required users (admin, member) were not created successfully.",
      );
    }

    if (!adminUser.team_id) {
      throw new Error("Admin user does not have a team_id");
    }

    await createTestData(adminUser.team_id, adminUser.id, memberUser.id);

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
