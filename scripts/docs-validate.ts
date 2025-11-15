#!/usr/bin/env bun
/**
 * Documentation Validation Script
 *
 * Checks for broken internal links in documentation files.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const DOC_DIR = "docs/dev/.devOps";
const DOC_FILES = [
  "README.md",
  "setup.md",
  "frontend.md",
  "backend.md",
  "testing.md",
  "reference.md",
  "GLOSSARY.md",
  "APPENDIX.md",
];

interface Link {
  text: string;
  target: string;
  file: string;
  line: number;
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  return files;
}

function extractLinks(content: string, filePath: string): Link[] {
  const links: Link[] = [];
  const lines = content.split("\n");

  // Match markdown links: [text](./path) or [text](#anchor)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const text = match[1];
      const target = match[2];
      if (text && target) {
        links.push({
          text,
          target,
          file: filePath,
          line: index + 1,
        });
      }
    }
  });

  return links;
}

function resolveLinkTarget(target: string, fromFile: string): string | null {
  // Skip external links
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return null;
  }

  // Handle anchor links (same file)
  if (target.startsWith("#")) {
    return fromFile; // Same file, anchor validation would require parsing headings
  }

  // Handle relative paths
  const lastSlashIndex = fromFile.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return null;
  }
  const baseDir = fromFile.substring(0, lastSlashIndex);

  // Strip anchor from target before resolving path
  const targetWithoutAnchor = target.split("#")[0];
  const resolved = join(baseDir, targetWithoutAnchor).replace(/\\/g, "/");

  // Normalize path
  return resolved;
}

function checkFileExists(filePath: string): boolean {
  try {
    const stat = statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function validateLinks(): { valid: number; broken: Link[] } {
  const allFiles = findMarkdownFiles(DOC_DIR);
  const allLinks: Link[] = [];

  // Extract all links from all markdown files
  for (const file of allFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const links = extractLinks(content, file);
      allLinks.push(...links);
    } catch (error) {
      console.warn(`Warning: Could not read ${file}`);
    }
  }

  // Validate links
  const broken: Link[] = [];
  let valid = 0;

  for (const link of allLinks) {
    // Skip external links
    if (
      link.target.startsWith("http://") ||
      link.target.startsWith("https://")
    ) {
      valid++;
      continue;
    }

    // Skip anchor links (would need to parse headings to validate)
    if (link.target.startsWith("#")) {
      valid++;
      continue;
    }

    const resolved = resolveLinkTarget(link.target, link.file);
    if (resolved && checkFileExists(resolved)) {
      valid++;
    } else {
      broken.push(link);
    }
  }

  return { valid, broken };
}

function main() {
  console.log("🔍 Validating Documentation Links\n");

  const result = validateLinks();

  if (result.broken.length === 0) {
    console.log(`✅ All ${result.valid} internal links are valid!\n`);
    return 0;
  }

  console.log(`⚠️  Found ${result.broken.length} broken link(s):\n`);

  for (const link of result.broken) {
    console.log(`   ${link.file}:${link.line}`);
    console.log(`   Link: [${link.text}](${link.target})`);
    console.log();
  }

  console.log(`✅ ${result.valid} valid link(s)\n`);
  return 1;
}

const exitCode = main();
process.exit(exitCode);
