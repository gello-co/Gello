import { unlinkSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../../../ProjectSourceCode/src/lib/logger.js";

const LOCK_DIR = join(process.cwd(), "ProjectSourceCode/.test-locks");
const LOCK_FILE = join(LOCK_DIR, "db-reset.lock");

interface LockInfo {
  pid: number;
  timestamp: number;
  requestId: string;
}

export async function acquireDbLock(
  requestId: string,
  timeoutMs = 10000, // 10 seconds for local operations
): Promise<() => Promise<void>> {
  const startTime = Date.now();

  await mkdir(LOCK_DIR, { recursive: true }).catch(() => {});

  while (Date.now() - startTime < timeoutMs) {
    try {
      const lockInfo: LockInfo = {
        pid: process.pid,
        timestamp: Date.now(),
        requestId,
      };

      await writeFile(LOCK_FILE, JSON.stringify(lockInfo), { flag: "wx" });

      logger.info({ requestId, pid: process.pid }, "[db-lock] Acquired lock");

      return async () => {
        try {
          await unlink(LOCK_FILE);
          logger.debug({ requestId }, "[db-lock] Released lock");
        } catch (error) {
          logger.warn(
            {
              requestId,
              error: error instanceof Error ? error.message : String(error),
            },
            "[db-lock] Failed to release lock",
          );
        }
      };
    } catch (_error) {
      try {
        const lockContent = await readFile(LOCK_FILE, "utf-8");
        const lockInfo: LockInfo = JSON.parse(lockContent);

        if (!isProcessAlive(lockInfo.pid)) {
          logger.warn(
            { requestId, stalePid: lockInfo.pid },
            "[db-lock] Removing stale lock",
          );
          await unlink(LOCK_FILE);
          continue;
        }

        const waitTime = Math.min(500, timeoutMs - (Date.now() - startTime));
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  throw new Error(`Failed to acquire DB lock after ${timeoutMs}ms`);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

process.on("exit", () => {
  try {
    unlinkSync(LOCK_FILE);
  } catch {
    // Ignore cleanup errors on exit
  }
});
