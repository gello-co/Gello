#!/usr/bin/env bun

import { copycat } from "@snaplet/copycat";
import { createSeedClient } from "@snaplet/seed";
import { hashSync } from "bcryptjs";
import {
  deterministicPointsReason,
  type POINTS_REASON_CHOICES,
  SNAPLET_SEED_VALUE,
} from "../supabase/seed/seed.config";

type RunSeedOptions = {
  dryRun?: boolean;
  skipReset?: boolean;
};

export type RunSeedResult = {
  dryRun: boolean;
  skipReset: boolean;
  counts: {
    teams: number;
    users: number;
    boards: number;
    lists: number;
    tasks: number;
    points: number;
  };
};

type TeamKey = "alpha" | "beta";
type UserKey = "admin" | "manager" | "member";
type BoardKey = "alpha-roadmap" | "beta-ops";
type ListKey =
  | "alpha-backlog"
  | "alpha-progress"
  | "alpha-done"
  | "beta-todo"
  | "beta-progress"
  | "beta-review";
type TaskKey =
  | "ship-csat"
  | "patch-websocket"
  | "document-runbook"
  | "stabilize-oncall"
  | "retro-summary";
type PointsReason = (typeof POINTS_REASON_CHOICES)[number];

export const SEEDED_USER_PASSWORD =
  process.env.SNAPLET_SEED_PASSWORD ?? "password123";

// Fixed password hash for "password123" (bcrypt with cost 12)
// This ensures deterministic password hashes across test runs
// Generated once and stored as constant to avoid random salt issues
// This hash was generated with: hashSync('password123', 12)
// IMPORTANT: This hash MUST match "password123" - verify with compareSync
// If login fails, regenerate this hash and update it here
// Verified: compareSync('password123', this_hash) === true
const FIXED_PASSWORD_HASH_FOR_PASSWORD123 =
  "$2b$12$LaVi9.3a9Mg3isgRS2sAzOnPWEFZZglxaDzHrXBCj4gn5nKIGEt2m";

const DEFAULT_PASSWORD_HASH =
  process.env.SNAPLET_SEED_PASSWORD_HASH ??
  (SEEDED_USER_PASSWORD === "password123"
    ? FIXED_PASSWORD_HASH_FOR_PASSWORD123
    : hashSync(SEEDED_USER_PASSWORD, 12));

const deterministicId = (label: string) =>
  copycat.uuid(`${SNAPLET_SEED_VALUE}:${label}`);

const TEAMS: Array<{ key: TeamKey; name: string }> = [
  { key: "alpha", name: "Alpha Team" },
  { key: "beta", name: "Beta Team" },
];

const USERS: Array<{
  key: UserKey;
  email: string;
  displayName: string;
  role: "admin" | "manager" | "member";
  teamKey: TeamKey | null;
  avatarUrl?: string | null;
  totalPoints: number;
}> = [
  {
    key: "admin",
    email: "admin@test.com",
    displayName: "System Admin",
    role: "admin",
    teamKey: null,
    avatarUrl: null,
    totalPoints: 0,
  },
  {
    key: "manager",
    email: "manager@test.com",
    displayName: "Delivery Manager",
    role: "manager",
    teamKey: "alpha",
    avatarUrl: null,
    totalPoints: 5,
  },
  {
    key: "member",
    email: "member@test.com",
    displayName: "Beta IC",
    role: "member",
    teamKey: "beta",
    avatarUrl: null,
    totalPoints: 15,
  },
];

const BOARDS: Array<{
  key: BoardKey;
  name: string;
  description: string;
  teamKey: TeamKey;
  createdBy: UserKey;
}> = [
  {
    key: "alpha-roadmap",
    name: "Alpha Delivery Roadmap",
    description: "Quarterly roadmap for delivery priorities.",
    teamKey: "alpha",
    createdBy: "manager",
  },
  {
    key: "beta-ops",
    name: "Beta Operations Board",
    description: "Day-to-day Beta team visibility.",
    teamKey: "beta",
    createdBy: "member",
  },
];

const LISTS: Array<{
  key: ListKey;
  boardKey: BoardKey;
  name: string;
  position: number;
}> = [
  {
    key: "alpha-backlog",
    boardKey: "alpha-roadmap",
    name: "Backlog",
    position: 1,
  },
  {
    key: "alpha-progress",
    boardKey: "alpha-roadmap",
    name: "In Progress",
    position: 2,
  },
  { key: "alpha-done", boardKey: "alpha-roadmap", name: "Done", position: 3 },
  { key: "beta-todo", boardKey: "beta-ops", name: "To Do", position: 1 },
  {
    key: "beta-progress",
    boardKey: "beta-ops",
    name: "In Flight",
    position: 2,
  },
  { key: "beta-review", boardKey: "beta-ops", name: "Review", position: 3 },
];

const TASKS: Array<{
  key: TaskKey;
  listKey: ListKey;
  title: string;
  description: string;
  storyPoints: number;
  position: number;
  assignedTo: UserKey;
  dueInDays: number;
  completedAtDaysOffset?: number;
}> = [
  {
    key: "ship-csat",
    listKey: "alpha-progress",
    title: "Ship CSAT dashboard",
    description: "Wire real-time CSAT metrics into the leadership dashboard.",
    storyPoints: 5,
    position: 1,
    assignedTo: "manager",
    dueInDays: 3,
  },
  {
    key: "patch-websocket",
    listKey: "alpha-done",
    title: "Patch websocket reconnection bug",
    description: "Fix race condition in SSE reconnection loop.",
    storyPoints: 3,
    position: 1,
    assignedTo: "manager",
    dueInDays: -2,
    completedAtDaysOffset: -1,
  },
  {
    key: "document-runbook",
    listKey: "beta-todo",
    title: "Document on-call runbook",
    description: "Capture incident response steps for the Beta team.",
    storyPoints: 2,
    position: 1,
    assignedTo: "member",
    dueInDays: 5,
  },
  {
    key: "stabilize-oncall",
    listKey: "beta-progress",
    title: "Stabilize on-call rotations",
    description: "Automate alerts and update ownership in PagerDuty.",
    storyPoints: 3,
    position: 1,
    assignedTo: "member",
    dueInDays: 2,
  },
  {
    key: "retro-summary",
    listKey: "beta-review",
    title: "Write retro summary",
    description: "Publish highlights and action items from the Beta retro.",
    storyPoints: 2,
    position: 1,
    assignedTo: "member",
    dueInDays: -1,
    completedAtDaysOffset: 0,
  },
];

const POINTS: Array<{
  key: string;
  userKey: UserKey;
  points: number;
  reasonSeed: PointsReason;
  taskKey?: TaskKey;
  awardedBy?: UserKey;
  notes?: string | null;
}> = [
  {
    key: "retro-points",
    userKey: "member",
    points: 10,
    reasonSeed: "task_complete",
    taskKey: "retro-summary",
    awardedBy: "manager",
    notes: "Completed Beta retro and shared learnings cross-team.",
  },
  {
    key: "manual-collab",
    userKey: "member",
    points: 5,
    reasonSeed: "manual_award",
    awardedBy: "manager",
    notes: "Jumped into Alpha incident even though off rotation.",
  },
  {
    key: "manager-coaching",
    userKey: "manager",
    points: 5,
    reasonSeed: "manual_award",
    awardedBy: "admin",
    notes: "Mentored Beta squad through accountability review.",
  },
];

const nowIso = () => new Date().toISOString();

const daysFromNowIso = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export async function runSeed(
  options: RunSeedOptions = {},
): Promise<RunSeedResult> {
  // Default to dryRun=true (safe) unless explicitly disabled
  // Matches behavior in supabase/seed/seed.ts
  const dryRun = options.dryRun ?? process.env.SNAPLET_SEED_DRY_RUN !== "false";
  const skipReset =
    options.skipReset ?? process.env.SNAPLET_SKIP_RESET === "true";

  const seed = await createSeedClient({ dryRun });

  if (!skipReset) {
    await seed.$resetDatabase();
  }

  const teamMap = new Map<TeamKey, string>();
  for (const team of TEAMS) {
    teamMap.set(team.key, deterministicId(`team-${team.key}`));
  }

  const userMap = new Map<UserKey, string>();
  for (const user of USERS) {
    userMap.set(user.key, deterministicId(`user-${user.key}`));
  }

  const boardMap = new Map<BoardKey, string>();
  for (const board of BOARDS) {
    boardMap.set(board.key, deterministicId(`board-${board.key}`));
  }

  const listMap = new Map<ListKey, string>();
  for (const list of LISTS) {
    listMap.set(list.key, deterministicId(`list-${list.key}`));
  }

  const taskMap = new Map<TaskKey, string>();
  for (const task of TASKS) {
    taskMap.set(task.key, deterministicId(`task-${task.key}`));
  }

  await seed.teams(
    TEAMS.map((team) => ({
      id: teamMap.get(team.key),
      name: team.name,
    })),
  );

  await seed.publicUsers(
    USERS.map((user) => ({
      id: userMap.get(user.key),
      email: user.email,
      passwordHash: DEFAULT_PASSWORD_HASH,
      displayName: user.displayName,
      role: user.role,
      teamId: user.teamKey ? (teamMap.get(user.teamKey) ?? null) : null,
      totalPoints: user.totalPoints,
      avatarUrl: user.avatarUrl ?? null,
    })),
  );

  await seed.authUsers(
    USERS.map((user) => ({
      id: userMap.get(user.key)!,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      encryptedPassword: DEFAULT_PASSWORD_HASH,
      emailConfirmedAt: nowIso(),
      lastSignInAt: nowIso(),
      createdAt: nowIso(),
      rawAppMetaData: { provider: "email", providers: ["email"] },
      rawUserMetaData: {
        display_name: user.displayName,
        role: user.role,
      },
    })),
  );

  await seed.identities(
    USERS.map((user) => ({
      id: deterministicId(`identity-${user.key}`),
      userId: userMap.get(user.key)!,
      provider: "email",
      providerId: user.email,
      identityData: {
        sub: userMap.get(user.key)!,
        email: user.email,
        email_verified: true,
        phone_verified: false,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSignInAt: nowIso(),
    })),
  );

  await seed.boards(
    BOARDS.map((board) => ({
      id: boardMap.get(board.key),
      name: board.name,
      description: board.description,
      teamId: teamMap.get(board.teamKey)!,
      createdBy: userMap.get(board.createdBy)!,
    })),
  );

  await seed.lists(
    LISTS.map((list) => ({
      id: listMap.get(list.key),
      boardId: boardMap.get(list.boardKey)!,
      name: list.name,
      position: list.position,
    })),
  );

  await seed.tasks(
    TASKS.map((task) => ({
      id: taskMap.get(task.key),
      listId: listMap.get(task.listKey)!,
      title: task.title,
      description: task.description,
      storyPoints: task.storyPoints,
      position: task.position,
      assignedTo: userMap.get(task.assignedTo)!,
      dueDate: daysFromNowIso(task.dueInDays),
      completedAt:
        typeof task.completedAtDaysOffset === "number"
          ? daysFromNowIso(task.completedAtDaysOffset)
          : null,
    })),
  );

  await seed.pointsHistories(
    POINTS.map((entry) => ({
      id: deterministicId(`points-${entry.key}`),
      userId: userMap.get(entry.userKey)!,
      pointsEarned: entry.points,
      reason: deterministicPointsReason(
        `${entry.reasonSeed}:${entry.key}`,
      ) as PointsReason,
      taskId: entry.taskKey ? taskMap.get(entry.taskKey)! : null,
      awardedBy: entry.awardedBy ? userMap.get(entry.awardedBy)! : null,
      notes: entry.notes ?? null,
    })),
  );

  // Note: user_context is auto-populated by sync_user_context trigger
  // when users are inserted, so no explicit insert needed here

  return {
    dryRun,
    skipReset,
    counts: {
      teams: TEAMS.length,
      users: USERS.length,
      boards: BOARDS.length,
      lists: LISTS.length,
      tasks: TASKS.length,
      points: POINTS.length,
    },
  };
}

async function main() {
  const result = await runSeed();
  console.info(
    `✅ Seeded ${result.counts.teams} teams, ${result.counts.users} users, ${result.counts.tasks} tasks.`,
  );
  process.exit(0);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Snaplet seed failed:", error);
    process.exit(1);
  });
}
