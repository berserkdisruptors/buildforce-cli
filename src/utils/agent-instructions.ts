import fs from "fs-extra";
import path from "path";

const BUILDFORCE_CONTEXT_HEADER = "## Buildforce Context";

const BUILDFORCE_CONTEXT_SECTION = `${BUILDFORCE_CONTEXT_HEADER}

This repository includes a curated context layer (\`.buildforce/context/\`) that captures
architecture decisions, coding conventions, and quality standards so they persist across
AI sessions. Prefer this over rediscovering patterns from raw source.

- \`/context-search <query>\` — Integrated automatically into your exploration flow. Use it proactively as a standalone skill when you need deeper insight into why something was built a certain way or what conventions apply.
- \`/context-add "<knowledge>"\` — When you learn something important during a session — a design decision, a convention, a non-obvious gotcha — capture it with this skill before it's lost. It classifies the knowledge into the right domain and grounds it in real code references.
- \`/context-extract\` — Automated context extraction that discovers structural, convention, and verification context from source files into the repository.
- \`/context-verify\` — Verifies your current branch changes against established conventions and verification procedures from the context repository. Produces a structured compliance report and a verification checklist. Use this any time you're verifying work — it is more reliable and thorough than ad-hoc checking.
`;

interface EnsureInstructionFilesOptions {
  selectedAi: string[];
}

export interface EnsureInstructionFilesResult {
  updated: string[];
  created: string[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSectionRange(
  content: string
): { start: number; end: number } | null {
  const headerRegex = new RegExp(
    `^${escapeRegExp(BUILDFORCE_CONTEXT_HEADER)}\\s*$`,
    "m"
  );
  const headerMatch = headerRegex.exec(content);
  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const start = headerMatch.index;
  const afterHeader = start + headerMatch[0].length;
  const nextHeaderRegex = /^##\s+.+$/gm;
  nextHeaderRegex.lastIndex = afterHeader;
  const nextHeaderMatch = nextHeaderRegex.exec(content);
  const end = nextHeaderMatch ? nextHeaderMatch.index : content.length;

  return { start, end };
}

async function resolvePreferredFile(
  projectPath: string,
  candidates: string[],
  fallback: string,
  createIfMissing: boolean
): Promise<string | null> {
  for (const candidate of candidates) {
    const candidatePath = path.join(projectPath, candidate);
    if (await fs.pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  if (createIfMissing) {
    return path.join(projectPath, fallback);
  }

  return null;
}

async function upsertBuildforceSection(filePath: string): Promise<boolean> {
  const existed = await fs.pathExists(filePath);
  const raw = existed ? await fs.readFile(filePath, "utf8") : "";
  const content = raw.replace(/\r\n/g, "\n");
  const range = findSectionRange(content);

  const next = range
    ? `${content.slice(0, range.start).trimEnd()}\n\n${BUILDFORCE_CONTEXT_SECTION}\n\n${content
        .slice(range.end)
        .trimStart()}`
    : `${content.trimEnd()}${content.trim().length > 0 ? "\n\n" : ""}${BUILDFORCE_CONTEXT_SECTION}`;

  const normalized = next.endsWith("\n") ? next : `${next}\n`;
  if (normalized !== content || !existed) {
    await fs.writeFile(filePath, normalized, "utf8");
    return !existed;
  }

  return false;
}

/**
 * Ensure AGENTS.md/CLAUDE.md include a managed Buildforce context section.
 * - AGENTS.md is always created/updated.
 * - CLAUDE.md is updated when it exists, or created when Claude is selected.
 */
export async function ensureBuildforceInstructionFiles(
  projectPath: string,
  options: EnsureInstructionFilesOptions
): Promise<EnsureInstructionFilesResult> {
  const { selectedAi } = options;
  const shouldCreateClaude = selectedAi.includes("claude");

  const agentsPath = await resolvePreferredFile(
    projectPath,
    ["AGENTS.md", "Agents.md", "agents.md"],
    "AGENTS.md",
    true
  );

  const claudePath = await resolvePreferredFile(
    projectPath,
    ["CLAUDE.md", "Claude.md", "claude.md"],
    "CLAUDE.md",
    shouldCreateClaude
  );

  const targets = [agentsPath, claudePath].filter((p): p is string => !!p);
  const updated: string[] = [];
  const created: string[] = [];

  for (const targetPath of targets) {
    const wasCreated = await upsertBuildforceSection(targetPath);
    updated.push(path.basename(targetPath));
    if (wasCreated) {
      created.push(path.basename(targetPath));
    }
  }

  return { updated, created };
}
