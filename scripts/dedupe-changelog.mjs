#!/usr/bin/env bun
import { readFile, writeFile } from 'node:fs/promises';

const file = 'CHANGELOG.md';

function extractVersion(line) {
	// Matches: "# 1.2.3" or "# [1.2.3-alpha.1](...)"
	const m = line.match(/^# \[?([0-9]+\.[0-9]+\.[0-9]+(?:-[^\]\s]+)?)\]?/);
	return m ? m[1] : null;
}

(async () => {
	const orig = await readFile(file, 'utf8');
	const lines = orig.split(/\r?\n/);

	const seen = new Set();
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (line.startsWith('# ')) {
			const version = extractVersion(line);
			if (version) {
				if (seen.has(version)) {
					// skip until next header
					i++;
					while (i < lines.length && !lines[i].startsWith('# ')) i++;
					continue;
				}
				seen.add(version);
			}
		}
		out.push(line);
		i++;
	}

	const next = out.join('\n');
	if (next !== orig) {
		await writeFile(file, next, 'utf8');
		console.log('[changelog-dedupe] Removed duplicate version sections');
	} else {
		console.log('[changelog-dedupe] No duplicates found');
	}
})();
