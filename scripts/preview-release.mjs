#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { default: semanticRelease } = await import("semantic-release");

const args = process.argv.slice(2);
let branch = "dev";
let enforceCheckout = true;
let currentBranch;

for (let i = 0; i < args.length; i++) {
	const a = args[i];
	if (a === "--branch" || a === "-b") {
		branch = args[i + 1] || branch;
		i++;
	} else if (a.startsWith("--branch=")) {
		branch = a.split("=")[1];
	} else if (a === "--allow-off-branch") {
		enforceCheckout = false;
	}
}

const cwd = process.cwd();
const outDir = path.join(cwd, ".release-preview");
await fs.mkdir(outDir, { recursive: true });

try {
	const { stdout } = await execFileAsync("git", [
		"rev-parse",
		"--abbrev-ref",
		"HEAD",
	]);
	const current = stdout.trim();
	currentBranch = current;
	if (enforceCheckout && current !== branch) {
		console.error(
			`\n[preview-release] Refusing to run: current branch is '${current}', expected '${branch}'.` +
			`\nSwitch branches first: git fetch origin ${branch} --tags && git checkout ${branch}\n` +
			`Or pass --allow-off-branch to override (preview only).`,
		);
		process.exit(2);
	}
} catch (_e) {
	console.warn(
		"[preview-release] Warning: unable to determine current branch.",
	);
}

try {
	let branchesConfig = branch;
	if (!enforceCheckout && currentBranch && currentBranch !== branch) {
		// Include the target branch plus current feature branch as a dev channel
		const targetBranch =
			branch === "main" ? { name: "main" } : { name: "dev", prerelease: "dev" };
		const featureAsDev = {
			name: currentBranch,
			channel: "dev",
			prerelease: "dev",
		};
		branchesConfig = [targetBranch, featureAsDev];
		console.log(
			`[preview-release] Off-branch preview: treating '${currentBranch}' as a dev prerelease channel (with base '${targetBranch.name}')`,
		);
	}
	const result = await semanticRelease(
		{
			dryRun: true,
			ci: false,
			branches: branchesConfig,
		},
		{
			cwd,
			env: process.env,
			stdout: process.stdout,
			stderr: process.stderr,
		},
	);

	if (!result || !result.nextRelease) {
		console.log(
			"[preview-release] No next release determined (no relevant changes?)",
		);
		process.exit(0);
	}

	const { version, notes } = result.nextRelease;
	const date = new Date().toISOString().split("T")[0];

	const releaseNotesPath = path.join(outDir, "RELEASE_NOTES.md");
	const changelogPath = path.join(outDir, "CHANGELOG.md");
	const changelogPreviewPath = path.join(outDir, "CHANGELOG.preview.md");

	await fs.writeFile(
		releaseNotesPath,
		`# Release notes (preview)\n\n## ${version} — ${date}\n\n${notes}\n`,
		"utf8",
	);

	const changelogContent = `# Changelog (preview)\n\nAll notable changes to this project will appear here when released.\n\n## ${version} — ${date}\n\n${notes}\n`;
	await fs.writeFile(changelogPath, changelogContent, "utf8");

	// If real CHANGELOG.md exists, prepend preview
	try {
		const existing = await fs.readFile(path.join(cwd, "CHANGELOG.md"), "utf8");
		const previewCombined = `## ${version} — ${date}\n\n${notes}\n\n${existing}`;
		await fs.writeFile(changelogPreviewPath, previewCombined, "utf8");
	} catch (_) { }

	console.log("[preview-release] Wrote preview files:");
	console.log("  -", path.relative(cwd, releaseNotesPath));
	console.log("  -", path.relative(cwd, changelogPath));
	try {
		await fs.access(changelogPreviewPath);
		console.log("  -", path.relative(cwd, changelogPreviewPath));
	} catch { }
	console.log(`[preview-release] Branch evaluated: ${branch}`);
} catch (err) {
	console.error("[preview-release] Failed to generate preview");
	if (err && err.name === "AggregateError") {
		console.error(
			"Tip: Ensure your local repo has a remote and the release branches exist. Try:\n" +
			"  git remote -v\n  git fetch origin --tags --prune\n  git fetch origin dev main --depth=1\n" +
			"Or run the CI workflow_dispatch dry-run on dev/main for an authoritative preview.",
		);
	}
	console.error(err);
	process.exit(1);
}
