#!/usr/bin/env npx tsx
/**
 * CLI script: normalize agent templates for a target agent.
 *
 * Usage:
 *   npx tsx src/scripts/normalize-agent-templates.ts <agent> <directory>
 *
 * Reads all .md files in <directory>, applies normalizeTemplate() for
 * the given <agent>, and writes back in-place.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { normalizeTemplate } from "../utils/agent-normalize.js";

const [agent, directory] = process.argv.slice(2);

if (!agent || !directory) {
  console.error(
    "Usage: npx tsx src/scripts/normalize-agent-templates.ts <agent> <directory>"
  );
  process.exit(1);
}

const files = readdirSync(directory).filter((f) => f.endsWith(".md"));

for (const file of files) {
  const filePath = join(directory, file);
  const content = readFileSync(filePath, "utf8");
  const normalized = normalizeTemplate(content, agent);
  if (normalized !== content) {
    writeFileSync(filePath, normalized, "utf8");
    console.log(`  Normalized: ${file}`);
  }
}

console.log(
  `  Done — ${files.length} file(s) processed for ${agent}`
);
