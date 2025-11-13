#!/usr/bin/env bun
/**
 * Documentation Check Script
 *
 * Analyzes recent commits and suggests which documentation files might need updates.
 * Non-blocking reminder tool.
 */

import { execSync } from "child_process";

const DOC_FILES = [
  "docs/dev/.devOps/README.md",
  "docs/dev/.devOps/setup.md",
  "docs/dev/.devOps/frontend.md",
  "docs/dev/.devOps/backend.md",
  "docs/dev/.devOps/testing.md",
  "docs/dev/.devOps/reference.md",
  "docs/dev/.devOps/GLOSSARY.md",
  "docs/dev/.devOps/APPENDIX.md",
];

const SOURCE_PATTERNS = [
  "ProjectSourceCode/src/server/routes/",
  "ProjectSourceCode/src/lib/services/",
  "ProjectSourceCode/src/views/",
  "supabase/migrations/",
];

function getRecentCommits(days = 7): string[] {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const output = execSync(
      `git log --since="${sinceStr}" --name-only --pretty=format: --diff-filter=ACMR | sort -u`,
      { encoding: "utf-8" },
    );

    return output
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("docs/dev/.devOps/"));
  } catch (error) {
    console.warn(
      "Could not get git history (this is OK in CI or non-git environments)",
    );
    return [];
  }
}

function analyzeChanges(changedFiles: string[]): {
  needsRunbook: boolean;
  needsGlossary: boolean;
  needsAppendix: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let needsRunbook = false;
  let needsGlossary = false;
  let needsAppendix = false;

  for (const file of changedFiles) {
    // Check for new features/endpoints
    if (file.includes("routes/api/") || file.includes("routes/pages.ts")) {
      needsRunbook = true;
      suggestions.push(
        `New API/page route: ${file} - Consider adding to frontend.md or backend.md`,
      );
    }

    // Check for new services
    if (file.includes("lib/services/")) {
      needsRunbook = true;
      needsGlossary = true;
      suggestions.push(
        `New service: ${file} - Consider documenting in backend.md and GLOSSARY.md`,
      );
    }

    // Check for database changes
    if (file.includes("migrations/")) {
      needsRunbook = true;
      needsAppendix = true;
      suggestions.push(
        `Database migration: ${file} - Consider updating backend.md and APPENDIX.md`,
      );
    }

    // Check for new utilities
    if (file.includes("lib/utils/")) {
      needsGlossary = true;
      suggestions.push(
        `New utility: ${file} - Consider adding term to GLOSSARY.md`,
      );
    }

    // Check for new views/templates
    if (file.includes("views/")) {
      needsRunbook = true;
      suggestions.push(
        `New view/template: ${file} - Consider adding example to frontend.md`,
      );
    }
  }

  return { needsRunbook, needsGlossary, needsAppendix, suggestions };
}

function main() {
  console.log("📚 Documentation Check\n");

  const changedFiles = getRecentCommits(7);

  if (changedFiles.length === 0) {
    console.log("✅ No recent changes detected (or not in a git repository)");
    console.log(
      "   This is normal in CI environments or when docs are up to date.\n",
    );
    return;
  }

  const analysis = analyzeChanges(changedFiles);

  if (
    !analysis.needsRunbook &&
    !analysis.needsGlossary &&
    !analysis.needsAppendix
  ) {
    console.log(
      "✅ No obvious documentation updates needed based on recent changes.\n",
    );
    return;
  }

  console.log("💡 Documentation Update Suggestions:\n");

  if (analysis.needsRunbook) {
    console.log("   📖 Documentation might need updates:");
    console.log(
      "      - Add/update sections in setup.md, frontend.md, backend.md, or testing.md",
    );
    console.log("      - Verify instructions still work\n");
  }

  if (analysis.needsGlossary) {
    console.log("   📝 GLOSSARY.md might need updates:");
    console.log("      - Add new terms/concepts");
    console.log("      - Update existing definitions\n");
  }

  if (analysis.needsAppendix) {
    console.log("   📚 APPENDIX.md might need updates:");
    console.log("      - Add deep dives for new architecture decisions");
    console.log("      - Document troubleshooting steps for new issues\n");
  }

  if (analysis.suggestions.length > 0) {
    console.log("   Specific suggestions:");
    analysis.suggestions.slice(0, 5).forEach((suggestion) => {
      console.log(`      - ${suggestion}`);
    });
    if (analysis.suggestions.length > 5) {
      console.log(`      ... and ${analysis.suggestions.length - 5} more`);
    }
    console.log();
  }

  console.log(
    "   Remember: These are suggestions only. Update docs when it makes sense.\n",
  );
}

main();
