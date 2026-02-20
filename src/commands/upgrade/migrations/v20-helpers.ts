/**
 * Pure helper functions extracted from v2.0 migration for testability.
 * These are all pure transformations — no file I/O.
 */

/**
 * Convention item structure from old _guidelines.yaml
 */
export interface OldConventionItem {
  pattern?: string;
  convention?: string;
  standard?: string;
  rule?: string;
  requirement?: string;
  guideline?: string;
  quirk?: string;
  description?: string;
  enforcement?: "strict" | "recommended" | "reference";
  examples?: Array<{ file?: string; snippet?: string }>;
  example?: string;
  violations?: string[];
  reference_files?: string[];
  template?: string;
  migration_guide?: string;
  layers?: string[];
  files?: string[];
  variables?: string[];
  constants?: string[];
  functions?: string[];
  violation_example?: string;
}

/**
 * New convention file structure
 */
export interface NewConventionFile {
  id: string;
  name: string;
  type: "convention";
  sub_type: string;
  enforcement: "strict" | "recommended" | "reference";
  created: string;
  last_updated: string;
  description: string;
  examples?: Array<{ file: string; snippet: string }>;
  violations?: string[];
  reference_files?: string[];
  template?: string;
  migration_guide?: string;
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get the name field from an old convention item
 */
export function getItemName(item: OldConventionItem): string | null {
  return (
    item.pattern ||
    item.convention ||
    item.standard ||
    item.rule ||
    item.requirement ||
    item.guideline ||
    item.quirk ||
    null
  );
}

/**
 * Map old section name to new sub_type value
 */
export function sectionToSubType(section: string): string {
  const mapping: Record<string, string> = {
    architectural_patterns: "architectural-pattern",
    code_conventions: "code-convention",
    naming_conventions: "naming-convention",
    testing_standards: "testing-standard",
    dependency_rules: "dependency-rule",
    security_requirements: "security-requirement",
    performance_guidelines: "performance-guideline",
    accessibility_standards: "accessibility-standard",
    project_quirks: "project-quirk",
  };
  return mapping[section] || "code-convention";
}

/**
 * Convert an old convention item to new format
 */
export function convertToNewConvention(
  item: OldConventionItem,
  section: string,
  todayDate: string
): NewConventionFile | null {
  const name = getItemName(item);
  if (!name) {
    return null;
  }

  const newConvention: NewConventionFile = {
    id: toKebabCase(name),
    name: name,
    type: "convention",
    sub_type: sectionToSubType(section),
    enforcement: item.enforcement || "recommended",
    created: todayDate,
    last_updated: todayDate,
    description: item.description || `Convention: ${name}`,
  };

  if (item.examples && Array.isArray(item.examples)) {
    newConvention.examples = item.examples.map((ex) => ({
      file: ex.file || "example",
      snippet: ex.snippet || "",
    }));
  } else if (item.example && typeof item.example === "string") {
    newConvention.examples = [{ file: "example", snippet: item.example }];
  }

  if (item.template) {
    newConvention.template = item.template;
  }

  if (item.violations && Array.isArray(item.violations)) {
    newConvention.violations = item.violations;
  } else if (item.violation_example) {
    newConvention.violations = [item.violation_example];
  }

  if (item.reference_files && Array.isArray(item.reference_files)) {
    newConvention.reference_files = item.reference_files;
  }

  if (item.migration_guide) {
    newConvention.migration_guide = item.migration_guide;
  }

  return newConvention;
}

/**
 * Format a string value for YAML output
 */
export function formatYamlValue(value: string, _indent: number = 0): string {
  const indentStr = "  ".repeat(_indent);

  if (value.includes("\n")) {
    const lines = value.split("\n").map((line) => indentStr + "  " + line);
    return "|\n" + lines.join("\n");
  }

  if (value.includes(":") || value.includes("#") || value.includes("'") || value.includes('"')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}
