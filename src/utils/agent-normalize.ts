/**
 * Agent template normalization for multi-agent compatibility.
 *
 * Transforms canonical (Claude Code) agent templates to each agent's expected
 * format at build time. Pure transformation — no file I/O.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** PascalCase (Claude Code canonical) → lowercase (OpenCode) tool names */
const TOOL_NAME_MAP: Record<string, string> = {
  Read: "read",
  Glob: "glob",
  Grep: "grep",
  Edit: "edit",
  Write: "write",
  Bash: "bash",
  Task: "task",
  WebFetch: "webfetch",
  WebSearch: "websearch",
};

/** Canonical model id → provider-qualified model string (or undefined to omit) */
const MODEL_MAP: Record<string, string | undefined> = {
  inherit: undefined,
  sonnet: "anthropic/claude-sonnet-4-5",
  opus: "anthropic/claude-opus-4-6",
  haiku: "anthropic/claude-haiku-4-5",
};

/** Agent name → config folder prefix used in body path references */
const AGENT_PATH_PREFIX: Record<string, string> = {
  claude: ".claude",
  cursor: ".cursor",
  opencode: ".opencode",
};

type Agent = keyof typeof AGENT_PATH_PREFIX;

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

interface ParsedTemplate {
  /** Raw YAML frontmatter (without the --- delimiters) */
  raw: string;
  /** Markdown body after the closing --- */
  body: string;
}

/**
 * Split a markdown file with YAML frontmatter into its two parts.
 * Returns `null` if the file has no valid frontmatter block.
 */
export function parseFrontmatter(content: string): ParsedTemplate | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return { raw: match[1], body: match[2] };
}

/**
 * Serialize frontmatter fields back into a YAML block string.
 * Only emits fields that are defined.
 */
function serializeFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "object" && value !== null) {
      // YAML map (tools map for OpenCode)
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${v}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Conversion functions
// ---------------------------------------------------------------------------

/**
 * Convert a comma-separated tools string to a map of enabled tools.
 * `"Read, Glob, Grep"` → `{ read: true, glob: true, grep: true }`
 */
export function convertToolsToMap(
  toolsString: string
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const raw of toolsString.split(",")) {
    const name = raw.trim();
    const mapped = TOOL_NAME_MAP[name];
    if (mapped) {
      map[mapped] = true;
    }
  }
  return map;
}

/**
 * Convert a canonical model identifier to its provider-qualified form.
 * Returns `undefined` when the model should be omitted (e.g. `inherit`).
 */
export function convertModel(model: string): string | undefined {
  const trimmed = model.trim();
  if (trimmed in MODEL_MAP) return MODEL_MAP[trimmed];
  // Unknown model — pass through unchanged
  return trimmed;
}

/**
 * Replace `.claude/` path references in the template body with the
 * appropriate agent folder prefix.
 */
export function substituteBodyPaths(body: string, agent: string): string {
  const prefix = AGENT_PATH_PREFIX[agent];
  if (!prefix || prefix === ".claude") return body;
  return body.replace(/\.claude\//g, `${prefix}/`);
}

// ---------------------------------------------------------------------------
// Agent-specific normalization
// ---------------------------------------------------------------------------

/**
 * Parse raw YAML frontmatter into a simple key→value map.
 * Handles only single-line scalar values (sufficient for agent templates).
 */
function parseYamlFields(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (m) {
      fields[m[1]] = m[2];
    }
  }
  return fields;
}

/**
 * Normalize frontmatter for OpenCode:
 * - Remove `name` (OpenCode derives it from filename)
 * - Convert `tools` string → YAML map
 * - Convert `model` → provider-qualified or omit
 * - Add `mode: subagent`
 */
export function normalizeToOpenCode(
  rawFrontmatter: string
): Record<string, unknown> {
  const fields = parseYamlFields(rawFrontmatter);
  const result: Record<string, unknown> = {};

  // description — keep as-is
  if (fields.description) {
    result.description = fields.description;
  }

  // mode — always subagent for OpenCode
  result.mode = "subagent";

  // tools — convert to map
  if (fields.tools) {
    result.tools = convertToolsToMap(fields.tools);
  }

  // model — convert; omit if inherit/undefined
  if (fields.model) {
    const converted = convertModel(fields.model);
    if (converted !== undefined) {
      result.model = converted;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Normalize a full template (frontmatter + body) for the target agent.
 *
 * - `claude` → returned unchanged (canonical format)
 * - `cursor` → body path substitution only
 * - `opencode` → frontmatter normalization + body path substitution
 */
export function normalizeTemplate(content: string, agent: string): string {
  if (agent === "claude") return content;

  const parsed = parseFrontmatter(content);
  if (!parsed) return content;

  if (agent === "opencode") {
    const normalized = normalizeToOpenCode(parsed.raw);
    const yaml = serializeFrontmatter(normalized);
    const body = substituteBodyPaths(parsed.body, agent);
    return `---\n${yaml}\n---\n${body}`;
  }

  if (agent === "cursor") {
    const body = substituteBodyPaths(parsed.body, agent);
    return `---\n${parsed.raw}\n---\n${body}`;
  }

  // Unknown agent — return unchanged
  return content;
}
