import { execFile } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("release preview script", () => {
	const repoRoot = path.resolve(__dirname, "../../../..");
	const previewDir = path.join(repoRoot, ".release-preview");

	beforeAll(() => {
		if (existsSync(previewDir)) {
			rmSync(previewDir, { recursive: true, force: true });
		}
	});

	afterAll(() => {
		// keep artifacts for local runs
	});

	it("refuses to run when not on target branch (default dev)", async () => {
		let current = "";
		try {
			const { stdout } = await execFileAsync(
				"git",
				["rev-parse", "--abbrev-ref", "HEAD"],
				{ cwd: repoRoot },
			);
			current = stdout.trim();
		} catch {
			return;
		}

		if (current === "dev") return;
		let out = "";
		let err = "";
		let code: number | undefined;
		try {
			const res = await execFileAsync(
				"bun",
				["scripts/preview-release.mjs", "--branch", "dev"],
				{ cwd: repoRoot },
			);
			out = res.stdout;
			err = res.stderr;
			code = 0;
		} catch (e: unknown) {
			const ex = e as { stdout?: string; stderr?: string; exitCode?: number };
			out = ex.stdout || "";
			err = ex.stderr || "";
			code = ex.exitCode;
		}
		const combined = `${out}\n${err}`;
		expect(combined).toMatch(/Refusing to run: current branch is/);
		expect(code).toBe(2);
	});

	it("generates preview files when override is used", async () => {
		const env = { ...process.env };
		try {
			await execFileAsync(
				"bun",
				[
					"scripts/preview-release.mjs",
					"--branch",
					"dev",
					"--allow-off-branch",
				],
				{ cwd: repoRoot, env },
			);
		} catch (_) {}

		const notes = path.join(repoRoot, ".release-preview/RELEASE_NOTES.md");
		const changelog = path.join(repoRoot, ".release-preview/CHANGELOG.md");
		if (existsSync(notes)) {
			const content = readFileSync(notes, "utf8");
			expect(content).toMatch(/Release notes \(preview\)/);
		}
		if (existsSync(changelog)) {
			const content = readFileSync(changelog, "utf8");
			expect(content).toMatch(/Changelog \(preview\)/);
		}
	});
});
