import { createClient } from "@supabase/supabase-js";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "admin@test.com";
const MEMBER_EMAIL = "member@test.com";
const PASSWORD = "password123";

async function login(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.statusText}`);
  }

  const cookie = response.headers.get("set-cookie");
  if (!cookie) {
    throw new Error(`No cookie returned for ${email}`);
  }
  return cookie;
}

async function verifyLeaderboard(role: "admin" | "member") {
  console.log(`\n🔍 Verifying Leaderboard for ${role}...`);
  const email = role === "admin" ? ADMIN_EMAIL : MEMBER_EMAIL;

  try {
    const cookie = await login(email, PASSWORD);

    const response = await fetch(`${BASE_URL}/leaderboard`, {
      headers: {
        Cookie: cookie,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    const html = await response.text();

    // Check for common elements
    if (!html.includes("Leaderboard")) {
      console.error("❌ Leaderboard title not found");
      return false;
    }

    // Check for role-specific elements
    if (role === "admin") {
      if (html.includes("Send Encouragement")) {
        console.log(
          "✅ Admin view confirmed: 'Send Encouragement' button found"
        );
      } else {
        console.error(
          "❌ Admin view failed: 'Send Encouragement' button NOT found"
        );
        return false;
      }
    } else {
      if (!html.includes("Send Encouragement")) {
        console.log(
          "✅ Member view confirmed: 'Send Encouragement' button NOT found"
        );
      } else {
        console.error(
          "❌ Member view failed: 'Send Encouragement' button found (should be hidden)"
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error verifying ${role} view:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Leaderboard Verification");

  const adminSuccess = await verifyLeaderboard("admin");
  const memberSuccess = await verifyLeaderboard("member");

  if (adminSuccess && memberSuccess) {
    console.log("\n✨ All verifications passed!");
    process.exit(0);
  } else {
    console.error("\n💥 Verification failed!");
    process.exit(1);
  }
}

main();
