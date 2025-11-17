#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Command } from "commander";

type CliOptions = {
  boardId: string;
  count: number;
};

function pickEnv(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (candidate && candidate.length > 0) return candidate;
  }
  return undefined;
}

function parseArgs(): CliOptions {
  const program = new Command();

  program
    .name("generate-tasks")
    .description("Generate test tasks for a board")
    .requiredOption(
      "--board <boardId>",
      "Board ID to generate tasks for (required)",
    )
    .option(
      "--count <n>",
      "Number of tasks to generate (default: 20)",
      (value) => {
        const count = Number.parseInt(value, 10);
        if (!Number.isFinite(count) || count <= 0) {
          throw new Error("count must be a positive integer");
        }
        return count;
      },
      20,
    )
    .configureHelp({
      showGlobalOptions: true,
    })
    .parse();

  const options = program.opts<{ board: string; count: number }>();

  return {
    boardId: options.board,
    count: options.count,
  };
}

async function main() {
  const { boardId, count } = parseArgs();

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

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "scripts/generate-tasks.ts" } },
  });

  const { data: lists, error: listError } = await supabase
    .from("lists")
    .select("id, name, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  if (listError) {
    throw new Error(`Failed to load lists: ${listError.message}`);
  }

  if (!lists || lists.length === 0) {
    throw new Error(`No lists found for board ${boardId}`);
  }

  const sentences = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Coordinate QA for the latest release candidate.",
    "Gather product analytics to validate my feelings.",
    "Improve accessibility for keyboard-only navigation.",
    "Refactor legacy service to follow current patterns.",
    "Document the workflow in the developer handbook.",
    "Partner with design to refine the UX copy.",
    "Ship incremental improvements to SSE resilience.",
    "Monitor performance metrics after deployment.",
    "Record a loom demo for the go-to-market team.",
  ];

  const tasks = Array.from({ length: count }, (_, index) => {
    const list = lists[index % lists.length]!;
    const storyPoints = [1, 2, 3, 5, 8, 13][index % 6]!;
    const description = sentences[index % sentences.length]!;
    return {
      id: randomUUID(),
      list_id: list.id,
      title: `Generated Task ${index + 1}`,
      description,
      story_points: storyPoints,
      position: index + 1,
    };
  });

  const { error: insertError } = await supabase.from("tasks").insert(tasks);
  if (insertError) {
    throw new Error(`Failed to insert tasks: ${insertError.message}`);
  }

  console.info(`✅ Inserted ${count} tasks across ${lists.length} list(s).`);
}

main().catch((error) => {
  console.error("❌ Task generation failed:", error);
  process.exit(1);
});
