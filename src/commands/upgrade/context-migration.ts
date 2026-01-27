import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

/**
 * Result of the context migration process
 */
export interface MigrationResult {
  migrated: boolean; // Whether migration was performed
  skipped: boolean; // True if already at target version
  actions: string[]; // List of actions taken for logging
  errors: string[]; // Any non-fatal errors encountered
}

/**
 * Item entry for v2.1 unified _index.yaml domains
 * Preserves original v2.0 structure and adds status/depth for coverage map
 */
interface DomainItem {
  id: string;
  file: string;
  type: string;
  description?: string;
  tags?: string[];
  related_context?: string[];
  // v2.1 coverage map fields
  status: "discovered" | "in-progress" | "extracted";
  depth: "none" | "shallow" | "moderate" | "deep";
  // Convention-specific fields
  sub_type?: string;
  enforcement?: string;
  // Verification-specific fields
  source?: string;
}

/**
 * Convention item structure from old _guidelines.yaml
 */
interface OldConventionItem {
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
 * Old _guidelines.yaml structure
 */
interface OldGuidelines {
  version?: string;
  last_updated?: string;
  architectural_patterns?: OldConventionItem[];
  code_conventions?: OldConventionItem[];
  naming_conventions?: OldConventionItem | OldConventionItem[];
  testing_standards?: OldConventionItem[];
  dependency_rules?: OldConventionItem[];
  security_requirements?: OldConventionItem[];
  performance_guidelines?: OldConventionItem[];
  accessibility_standards?: OldConventionItem[];
  project_quirks?: OldConventionItem[];
}

/**
 * New convention file structure
 */
interface NewConventionFile {
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
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Format a string value for YAML output
 * Uses block scalar (|) for multi-line strings, quotes for strings with special chars
 */
function formatYamlValue(value: string, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);

  // Check if multi-line
  if (value.includes("\n")) {
    const lines = value.split("\n").map((line) => indentStr + "  " + line);
    return "|\n" + lines.join("\n");
  }

  // Check if needs quoting (contains special chars)
  if (value.includes(":") || value.includes("#") || value.includes("'") || value.includes('"')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

/**
 * Serialize an _index.yaml file with proper formatting
 * Preserves header from existing file and adds blank lines between entries
 *
 * @param existingContent - Existing file content (to preserve header/documentation)
 * @param entries - Array of entries to serialize
 * @param entrySerializer - Function to convert each entry to YAML lines
 * @param fallbackHeader - Header to use if no existing content
 */
function serializeIndexFile<T>(
  existingContent: string | null,
  entries: T[],
  entrySerializer: (entry: T) => string[],
  fallbackHeader: string = 'version: "2.0"\n\n'
): string {
  // Serialize entries with blank lines between them
  const entriesYaml = entries
    .map((entry) => entrySerializer(entry).map((line) => "  " + line).join("\n"))
    .join("\n\n");

  if (existingContent) {
    // Find where contexts: section starts and preserve everything before it
    const contextsMatch = existingContent.match(/^([\s\S]*?)(contexts:\s*\[?\]?\s*)$/m);
    if (contextsMatch) {
      const header = contextsMatch[1];
      return header + "contexts:\n" + entriesYaml + "\n";
    }
  }

  // Fallback: create new file with header
  return fallbackHeader + "contexts:\n" + entriesYaml + "\n";
}

/**
 * Serialize a convention file to YAML with proper formatting
 * Uses block scalars for multi-line strings and adds blank lines between sections
 */
function serializeConventionFile(convention: NewConventionFile): string {
  const lines: string[] = [];

  // Required fields
  lines.push(`id: ${convention.id}`);
  lines.push(`name: "${convention.name}"`);
  lines.push(`type: ${convention.type}`);
  lines.push(`sub_type: ${convention.sub_type}`);
  lines.push(`enforcement: ${convention.enforcement}`);
  lines.push(`created: "${convention.created}"`);
  lines.push(`last_updated: "${convention.last_updated}"`);
  lines.push("");

  // Description (may be multi-line)
  lines.push(`description: ${formatYamlValue(convention.description, 0)}`);

  // Optional fields with blank lines between sections
  if (convention.examples && convention.examples.length > 0) {
    lines.push("");
    lines.push("examples:");
    for (const ex of convention.examples) {
      lines.push(`  - file: "${ex.file}"`);
      if (ex.snippet.includes("\n")) {
        lines.push(`    snippet: |`);
        for (const snippetLine of ex.snippet.split("\n")) {
          lines.push(`      ${snippetLine}`);
        }
      } else {
        lines.push(`    snippet: "${ex.snippet.replace(/"/g, '\\"')}"`);
      }
    }
  }

  if (convention.violations && convention.violations.length > 0) {
    lines.push("");
    lines.push("violations:");
    for (const v of convention.violations) {
      if (v.includes("\n")) {
        lines.push(`  - |`);
        for (const vLine of v.split("\n")) {
          lines.push(`    ${vLine}`);
        }
      } else {
        lines.push(`  - "${v.replace(/"/g, '\\"')}"`);
      }
    }
  }

  if (convention.reference_files && convention.reference_files.length > 0) {
    lines.push("");
    lines.push("reference_files:");
    for (const rf of convention.reference_files) {
      lines.push(`  - "${rf.replace(/"/g, '\\"')}"`);
    }
  }

  if (convention.template) {
    lines.push("");
    lines.push(`template: ${formatYamlValue(convention.template, 0)}`);
  }

  if (convention.migration_guide) {
    lines.push("");
    lines.push(`migration_guide: ${formatYamlValue(convention.migration_guide, 0)}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Convert a string to kebab-case for use as file ID
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Get the name field from an old convention item
 */
function getItemName(item: OldConventionItem): string | null {
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
function sectionToSubType(section: string): string {
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
 * Convert an old convention item to a new convention file structure
 */
function convertToNewConvention(
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

  // Handle examples - normalize to array format
  if (item.examples && Array.isArray(item.examples)) {
    newConvention.examples = item.examples.map((ex) => ({
      file: ex.file || "example",
      snippet: ex.snippet || "",
    }));
  } else if (item.example && typeof item.example === "string") {
    newConvention.examples = [
      {
        file: "example",
        snippet: item.example,
      },
    ];
  }

  // Handle template
  if (item.template) {
    newConvention.template = item.template;
  }

  // Handle violations
  if (item.violations && Array.isArray(item.violations)) {
    newConvention.violations = item.violations;
  } else if (item.violation_example) {
    newConvention.violations = [item.violation_example];
  }

  // Handle reference files
  if (item.reference_files && Array.isArray(item.reference_files)) {
    newConvention.reference_files = item.reference_files;
  }

  // Handle migration guide (for project_quirks)
  if (item.migration_guide) {
    newConvention.migration_guide = item.migration_guide;
  }

  return newConvention;
}

/**
 * Handle naming_conventions which can be an object with sub-fields
 * or an array of items
 */
function processNamingConventions(
  namingData: OldConventionItem | OldConventionItem[],
  todayDate: string
): NewConventionFile[] {
  const conventions: NewConventionFile[] = [];

  // If it's an object with sub-fields (files, variables, constants, functions)
  if (
    !Array.isArray(namingData) &&
    (namingData.files ||
      namingData.variables ||
      namingData.constants ||
      namingData.functions)
  ) {
    // Create one convention file that captures all naming rules
    const description = [];

    if (namingData.files && Array.isArray(namingData.files)) {
      description.push("Files:\n" + namingData.files.map((f) => `  - ${f}`).join("\n"));
    }
    if (namingData.variables && Array.isArray(namingData.variables)) {
      description.push(
        "Variables:\n" + namingData.variables.map((v) => `  - ${v}`).join("\n")
      );
    }
    if (namingData.constants && Array.isArray(namingData.constants)) {
      description.push(
        "Constants:\n" + namingData.constants.map((c) => `  - ${c}`).join("\n")
      );
    }
    if (namingData.functions && Array.isArray(namingData.functions)) {
      description.push(
        "Functions:\n" + namingData.functions.map((f) => `  - ${f}`).join("\n")
      );
    }

    if (description.length > 0) {
      conventions.push({
        id: "naming-conventions",
        name: "Naming Conventions",
        type: "convention",
        sub_type: "naming-convention",
        enforcement: "recommended",
        created: todayDate,
        last_updated: todayDate,
        description: description.join("\n\n"),
      });
    }
  }
  // If it's an array of naming convention items
  else if (Array.isArray(namingData)) {
    for (const item of namingData) {
      const converted = convertToNewConvention(item, "naming_conventions", todayDate);
      if (converted) {
        conventions.push(converted);
      }
    }
  }

  return conventions;
}

/**
 * Parse _guidelines.yaml and break it down into individual convention files
 */
export async function migrateGuidelinesFile(
  guidelinesPath: string,
  conventionsPath: string,
  todayDate: string
): Promise<{ files: string[]; errors: string[] }> {
  const result = { files: [] as string[], errors: [] as string[] };

  try {
    const content = await fs.readFile(guidelinesPath, "utf8");
    const guidelines = YAML.parse(content) as OldGuidelines;

    if (!guidelines || typeof guidelines !== "object") {
      result.errors.push("Invalid _guidelines.yaml structure");
      return result;
    }

    // Collect all conventions to create
    const allConventions: NewConventionFile[] = [];

    // Process each section
    const sections: (keyof OldGuidelines)[] = [
      "architectural_patterns",
      "code_conventions",
      "testing_standards",
      "dependency_rules",
      "security_requirements",
      "performance_guidelines",
      "accessibility_standards",
      "project_quirks",
    ];

    for (const section of sections) {
      const items = guidelines[section];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const converted = convertToNewConvention(item, section, todayDate);
          if (converted) {
            allConventions.push(converted);
          }
        }
      }
    }

    // Handle naming_conventions separately (can be object or array)
    if (guidelines.naming_conventions) {
      const namingConventions = processNamingConventions(
        guidelines.naming_conventions,
        todayDate
      );
      allConventions.push(...namingConventions);
    }

    // Write each convention to its own file
    for (const convention of allConventions) {
      const filename = `${convention.id}.yaml`;
      const filePath = path.join(conventionsPath, filename);

      // Don't overwrite existing files
      if (await fs.pathExists(filePath)) {
        result.errors.push(`Skipping ${filename} - file already exists`);
        continue;
      }

      // Use custom serializer for proper YAML formatting (block scalars, blank lines)
      const yamlContent = serializeConventionFile(convention);

      await fs.writeFile(filePath, yamlContent, "utf8");
      result.files.push(filename);
    }

    // Update conventions/_index.yaml with the new files
    const indexPath = path.join(conventionsPath, "_index.yaml");
    if (await fs.pathExists(indexPath)) {
      try {
        const indexContent = await fs.readFile(indexPath, "utf8");
        const index = YAML.parse(indexContent);

        if (index && typeof index === "object") {
          // Ensure contexts array exists
          if (!Array.isArray(index.contexts)) {
            index.contexts = [];
          }

          // Add entries for each created convention file
          for (const convention of allConventions) {
            // Check if already exists in index
            const exists = index.contexts.some(
              (ctx: { id?: string }) => ctx.id === convention.id
            );
            if (!exists) {
              index.contexts.push({
                id: convention.id,
                file: `${convention.id}.yaml`,
                sub_type: convention.sub_type,
                enforcement: convention.enforcement,
                description: convention.name,
              });
            }
          }

          // Write with preserved formatting using generic serializer
          const outputContent = serializeIndexFile(
            indexContent,
            index.contexts,
            (ctx: { id: string; file: string; sub_type: string; enforcement: string; description: string }) => [
              `- id: ${ctx.id}`,
              `  file: ${ctx.file}`,
              `  sub_type: ${ctx.sub_type}`,
              `  enforcement: ${ctx.enforcement}`,
              `  description: "${ctx.description.replace(/"/g, '\\"')}"`,
            ]
          );
          await fs.writeFile(indexPath, outputContent, "utf8");
        }
      } catch (e: any) {
        result.errors.push(`Error updating conventions/_index.yaml: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Error parsing _guidelines.yaml: ${e.message}`);
  }

  return result;
}

/**
 * Entry from v1.0 _index.yaml contexts array
 */
interface OldIndexEntry {
  id: string;
  file: string;
  type: string;
  description?: string;
  tags?: string[];
  related_context?: string[];
}

/**
 * New architecture _index.yaml entry structure
 */
interface NewArchitectureEntry {
  id: string;
  file: string;
  type: "structural";
  description?: string;
  tags?: string[];
  related_context?: string[];
}

/**
 * Migrate existing context files from root context/ to architecture/
 * Converts type field to "structural" for all files
 * Preserves original YAML formatting (blank lines, comments, structure)
 */
export async function migrateContextFilesToArchitecture(
  contextPath: string,
  architecturePath: string,
  todayDate: string
): Promise<{ files: string[]; errors: string[] }> {
  const result = { files: [] as string[], errors: [] as string[] };

  try {
    // Get all .yaml and .yml files in root context/ directory
    const items = await fs.readdir(contextPath);
    const contextFiles = items.filter((item) => {
      // Include both .yaml and .yml files, exclude special files and directories
      if (!item.endsWith(".yaml") && !item.endsWith(".yml")) return false;
      if (item.startsWith("_")) return false; // Skip _index.yaml, _schema.yaml, _graph.yaml, _guidelines.yaml
      return true;
    });

    for (const filename of contextFiles) {
      const sourcePath = path.join(contextPath, filename);
      // Normalize .yml to .yaml extension for consistency
      const destFilename = filename.endsWith(".yml")
        ? filename.replace(/\.yml$/, ".yaml")
        : filename;
      const destPath = path.join(architecturePath, destFilename);

      try {
        // Skip if it's a directory
        const stat = await fs.stat(sourcePath);
        if (stat.isDirectory()) continue;

        // Skip if destination already exists (check both original and normalized names)
        if (await fs.pathExists(destPath)) {
          result.errors.push(`Skipping ${filename} - already exists in architecture/`);
          continue;
        }

        // Read the file content
        let content = await fs.readFile(sourcePath, "utf8");

        // Verify it's valid YAML before modifying
        const parsed = YAML.parse(content);
        if (!parsed || typeof parsed !== "object") {
          result.errors.push(`Invalid YAML structure in ${filename}`);
          continue;
        }

        // Use regex to update type field while preserving formatting
        // Match type: followed by any value (quoted or unquoted)
        const typeRegex = /^(type:\s*)(?:"[^"]*"|'[^']*'|\S+)(\s*)$/m;
        if (typeRegex.test(content)) {
          content = content.replace(typeRegex, `$1structural$2`);
        }

        // Update last_updated field while preserving formatting
        const lastUpdatedRegex = /^(last_updated:\s*)(?:"[^"]*"|'[^']*'|\S+)(\s*)$/m;
        if (lastUpdatedRegex.test(content)) {
          content = content.replace(lastUpdatedRegex, `$1"${todayDate}"$2`);
        }

        // Write to architecture/ folder (preserving original formatting)
        await fs.writeFile(destPath, content, "utf8");

        // Delete the original file after successful copy
        await fs.remove(sourcePath);

        // Track with normalized filename (.yaml extension)
        result.files.push(destFilename);
      } catch (e: any) {
        result.errors.push(`Error migrating ${filename}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Error reading context directory: ${e.message}`);
  }

  return result;
}

/**
 * Migrate entries from root _index.yaml to architecture/_index.yaml
 * Converts type to "structural" for all entries
 */
export async function migrateIndexEntriesToArchitecture(
  rootIndexPath: string,
  archIndexPath: string
): Promise<{ entries: number; errors: string[] }> {
  const result = { entries: 0, errors: [] as string[] };

  try {
    // Read root _index.yaml (v1.0 format with contexts array)
    if (!(await fs.pathExists(rootIndexPath))) {
      return result;
    }

    const rootContent = await fs.readFile(rootIndexPath, "utf8");
    const rootIndex = YAML.parse(rootContent);

    if (!rootIndex || !Array.isArray(rootIndex.contexts)) {
      return result;
    }

    // Read architecture/_index.yaml
    let archIndex: { version: string; contexts: NewArchitectureEntry[] };
    if (await fs.pathExists(archIndexPath)) {
      const archContent = await fs.readFile(archIndexPath, "utf8");
      archIndex = YAML.parse(archContent);
      if (!archIndex || !Array.isArray(archIndex.contexts)) {
        archIndex = { version: "2.0", contexts: [] };
      }
    } else {
      archIndex = { version: "2.0", contexts: [] };
    }

    // Migrate each entry, converting type to "structural"
    // Skip entries that reference special files (_guidelines.yaml)
    for (const entry of rootIndex.contexts as OldIndexEntry[]) {
      // Skip _guidelines.yaml entry - this goes to conventions/
      if (entry.file === "_guidelines.yaml" || entry.id === "guidelines") {
        continue;
      }

      // Check if entry already exists in architecture index
      const exists = archIndex.contexts.some((ctx) => ctx.id === entry.id);
      if (exists) {
        result.errors.push(`Skipping entry ${entry.id} - already exists in architecture/_index.yaml`);
        continue;
      }

      // Normalize .yml to .yaml extension for consistency
      const normalizedFile = entry.file.endsWith(".yml")
        ? entry.file.replace(/\.yml$/, ".yaml")
        : entry.file;

      // Convert entry to new format with type="structural"
      const newEntry: NewArchitectureEntry = {
        id: entry.id,
        file: normalizedFile,
        type: "structural",
      };

      if (entry.description) {
        newEntry.description = entry.description;
      }
      if (entry.tags && Array.isArray(entry.tags)) {
        newEntry.tags = entry.tags;
      }
      if (entry.related_context && Array.isArray(entry.related_context)) {
        // Filter out references to guidelines - they should reference conventions if needed
        newEntry.related_context = entry.related_context.filter(
          (ref) => ref !== "guidelines"
        );
      }

      archIndex.contexts.push(newEntry);
      result.entries++;
    }

    // Write updated architecture/_index.yaml with preserved formatting using generic serializer
    const existingContent = (await fs.pathExists(archIndexPath))
      ? await fs.readFile(archIndexPath, "utf8")
      : null;

    const outputContent = serializeIndexFile(
      existingContent,
      archIndex.contexts,
      (ctx: NewArchitectureEntry) => {
        const lines = [`- id: ${ctx.id}`, `  file: ${ctx.file}`, `  type: ${ctx.type}`];
        if (ctx.description) {
          lines.push(`  description: "${ctx.description.replace(/"/g, '\\"')}"`);
        }
        if (ctx.tags && ctx.tags.length > 0) {
          lines.push(`  tags: [${ctx.tags.join(", ")}]`);
        }
        if (ctx.related_context && ctx.related_context.length > 0) {
          lines.push(`  related_context: [${ctx.related_context.join(", ")}]`);
        }
        return lines;
      }
    );
    await fs.writeFile(archIndexPath, outputContent, "utf8");
  } catch (e: any) {
    result.errors.push(`Error migrating index entries: ${e.message}`);
  }

  return result;
}

/**
 * Migrate context structure from version 1.0 to 2.0
 *
 * This function:
 * 1. Checks root _index.yaml version (1.0 → migrate, 2.0 → skip)
 * 2. Creates architecture/, conventions/, verification/ folders with schemas
 * 3. Copies new schema and index files from the template source
 * 4. Breaks down _guidelines.yaml into individual convention files
 * 5. Migrates existing context files to architecture/ with type="structural"
 * 6. Migrates _index.yaml entries to architecture/_index.yaml
 * 7. Updates root _index.yaml to version 2.0 directory format
 * 8. Cleans up old files from root context/
 */
export async function migrateContextStructure(
  projectPath: string,
  templateSourceDir: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    migrated: false,
    skipped: false,
    actions: [],
    errors: [],
  };

  const contextPath = path.join(projectPath, ".buildforce", "context");
  const rootIndexPath = path.join(contextPath, "_index.yaml");
  const todayDate = getTodayDate();

  // Check if context folder exists
  if (!(await fs.pathExists(contextPath))) {
    result.skipped = true;
    result.actions.push("No .buildforce/context/ folder found - skipping migration");
    return result;
  }

  // Check if root _index.yaml exists and its version
  if (await fs.pathExists(rootIndexPath)) {
    try {
      const indexContent = await fs.readFile(rootIndexPath, "utf8");
      const index = YAML.parse(indexContent);
      const version = index?.version;

      if (version === "2.0") {
        result.skipped = true;
        result.actions.push("Already at version 2.0 - skipping migration");
        return result;
      }
    } catch (e: any) {
      result.errors.push(`Error reading _index.yaml: ${e.message}`);
    }
  }

  // Perform migration
  try {
    // Create folder structure
    const architecturePath = path.join(contextPath, "architecture");
    const conventionsPath = path.join(contextPath, "conventions");
    const verificationPath = path.join(contextPath, "verification");

    // Check if any of the new folders already exist (partial migration)
    const archExists = await fs.pathExists(architecturePath);
    const convExists = await fs.pathExists(conventionsPath);
    const verExists = await fs.pathExists(verificationPath);

    if (archExists && convExists && verExists) {
      // Folders exist - check if they have _index.yaml files
      const archIndexExists = await fs.pathExists(path.join(architecturePath, "_index.yaml"));
      const convIndexExists = await fs.pathExists(path.join(conventionsPath, "_index.yaml"));
      const verIndexExists = await fs.pathExists(path.join(verificationPath, "_index.yaml"));

      if (archIndexExists && convIndexExists && verIndexExists) {
        // Already fully migrated
        result.skipped = true;
        result.actions.push("Context structure already exists - skipping folder creation");
        return result;
      }
    }

    await fs.ensureDir(architecturePath);
    await fs.ensureDir(conventionsPath);
    await fs.ensureDir(verificationPath);
    result.actions.push("Created context type folders: architecture/, conventions/, verification/");

    // Copy schema files from template
    // NOTE: The templateSourceDir is the extracted release ZIP which has .buildforce/context/, not src/context/
    const templateContextPath = path.join(templateSourceDir, ".buildforce", "context");

    // Copy architecture schema and index
    const archSchemaTemplatePath = path.join(templateContextPath, "architecture", "_schema.yaml");
    const archIndexTemplatePath = path.join(templateContextPath, "architecture", "_index.yaml");
    if (await fs.pathExists(archSchemaTemplatePath)) {
      await fs.copy(archSchemaTemplatePath, path.join(architecturePath, "_schema.yaml"));
      result.actions.push("Copied architecture/_schema.yaml from template");
    }
    if (await fs.pathExists(archIndexTemplatePath)) {
      // Only copy if doesn't exist (preserve user's index)
      const destPath = path.join(architecturePath, "_index.yaml");
      if (!(await fs.pathExists(destPath))) {
        await fs.copy(archIndexTemplatePath, destPath);
        result.actions.push("Copied architecture/_index.yaml from template");
      }
    }

    // Copy conventions schema and index
    const convSchemaTemplatePath = path.join(templateContextPath, "conventions", "_schema.yaml");
    const convIndexTemplatePath = path.join(templateContextPath, "conventions", "_index.yaml");
    if (await fs.pathExists(convSchemaTemplatePath)) {
      await fs.copy(convSchemaTemplatePath, path.join(conventionsPath, "_schema.yaml"));
      result.actions.push("Copied conventions/_schema.yaml from template");
    }
    if (await fs.pathExists(convIndexTemplatePath)) {
      const destPath = path.join(conventionsPath, "_index.yaml");
      if (!(await fs.pathExists(destPath))) {
        await fs.copy(convIndexTemplatePath, destPath);
        result.actions.push("Copied conventions/_index.yaml from template");
      }
    }

    // Copy verification schema and index
    const verSchemaTemplatePath = path.join(templateContextPath, "verification", "_schema.yaml");
    const verIndexTemplatePath = path.join(templateContextPath, "verification", "_index.yaml");
    if (await fs.pathExists(verSchemaTemplatePath)) {
      await fs.copy(verSchemaTemplatePath, path.join(verificationPath, "_schema.yaml"));
      result.actions.push("Copied verification/_schema.yaml from template");
    }
    if (await fs.pathExists(verIndexTemplatePath)) {
      const destPath = path.join(verificationPath, "_index.yaml");
      if (!(await fs.pathExists(destPath))) {
        await fs.copy(verIndexTemplatePath, destPath);
        result.actions.push("Copied verification/_index.yaml from template");
      }
    }

    // Migrate _guidelines.yaml to individual convention files
    const guidelinesPath = path.join(contextPath, "_guidelines.yaml");
    if (await fs.pathExists(guidelinesPath)) {
      const guidelinesResult = await migrateGuidelinesFile(
        guidelinesPath,
        conventionsPath,
        todayDate
      );

      if (guidelinesResult.files.length > 0) {
        result.actions.push(
          `Migrated _guidelines.yaml into ${guidelinesResult.files.length} convention files: ${guidelinesResult.files.join(", ")}`
        );
      } else {
        result.actions.push("No conventions found in _guidelines.yaml to migrate");
      }

      if (guidelinesResult.errors.length > 0) {
        result.errors.push(...guidelinesResult.errors);
      }

      // Delete original _guidelines.yaml after successful migration
      if (guidelinesResult.files.length > 0) {
        await fs.remove(guidelinesPath);
        result.actions.push("Deleted original _guidelines.yaml after successful migration");
      }
    } else {
      result.actions.push("No _guidelines.yaml found to migrate");
    }

    // Migrate existing context files to architecture/ folder
    // This happens BEFORE replacing root _index.yaml so we can read the old entries
    const contextFilesResult = await migrateContextFilesToArchitecture(
      contextPath,
      architecturePath,
      todayDate
    );

    if (contextFilesResult.files.length > 0) {
      result.actions.push(
        `Migrated ${contextFilesResult.files.length} context files to architecture/: ${contextFilesResult.files.slice(0, 5).join(", ")}${contextFilesResult.files.length > 5 ? "..." : ""}`
      );
    }

    if (contextFilesResult.errors.length > 0) {
      result.errors.push(...contextFilesResult.errors);
    }

    // Migrate _index.yaml entries to architecture/_index.yaml
    // This MUST happen BEFORE replacing root _index.yaml with v2.0 format
    const archIndexPath = path.join(architecturePath, "_index.yaml");
    const indexEntriesResult = await migrateIndexEntriesToArchitecture(
      rootIndexPath,
      archIndexPath
    );

    if (indexEntriesResult.entries > 0) {
      result.actions.push(
        `Migrated ${indexEntriesResult.entries} index entries to architecture/_index.yaml`
      );
    }

    if (indexEntriesResult.errors.length > 0) {
      result.errors.push(...indexEntriesResult.errors);
    }

    // Copy new root _index.yaml from template (AFTER migrating entries!)
    const rootIndexTemplatePath = path.join(templateContextPath, "_index.yaml");
    if (await fs.pathExists(rootIndexTemplatePath)) {
      await fs.copy(rootIndexTemplatePath, rootIndexPath);
      result.actions.push("Updated root _index.yaml to version 2.0 format");
    }

    // Delete old _schema.yaml from root if it exists (moved to architecture/)
    const oldSchemaPath = path.join(contextPath, "_schema.yaml");
    if (await fs.pathExists(oldSchemaPath)) {
      await fs.remove(oldSchemaPath);
      result.actions.push("Removed old root _schema.yaml (now in architecture/)");
    }

    // Delete empty _graph.yaml if it exists
    const graphPath = path.join(contextPath, "_graph.yaml");
    if (await fs.pathExists(graphPath)) {
      const graphContent = await fs.readFile(graphPath, "utf8");
      // Only delete if it's mostly empty (placeholder file)
      if (graphContent.trim().length < 100) {
        await fs.remove(graphPath);
        result.actions.push("Removed empty _graph.yaml placeholder");
      }
    }

    result.migrated = true;
  } catch (e: any) {
    result.errors.push(`Migration error: ${e.message}`);
  }

  return result;
}

/**
 * Entry from v2.0 domain-specific _index.yaml contexts array
 */
interface V20DomainEntry {
  id: string;
  file: string;
  type?: string;
  sub_type?: string;
  enforcement?: string;
  source?: string;
  description?: string;
  tags?: string[];
  related_context?: string[];
}

/**
 * Migrate context structure from version 2.0 to 2.1
 *
 * This function:
 * 1. Checks if domain-specific _index.yaml files exist (v2.0 indicator)
 * 2. Reads entries from architecture/_index.yaml, conventions/_index.yaml, verification/_index.yaml
 * 3. Converts entries to domains.*.items[] format in root _index.yaml
 * 4. Deletes domain-specific _index.yaml files
 * 5. Updates root _index.yaml version to 2.1
 *
 * Migration is idempotent - safe to run multiple times.
 * Handles both:
 *   - v1.0 → v2.1 (direct): No domain _index.yaml files exist, just update version
 *   - v2.0 → v2.1 (entry migration): Migrate entries from domain _index.yaml files
 */
export async function migrate21(
  projectPath: string,
  templateSourceDir: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    migrated: false,
    skipped: false,
    actions: [],
    errors: [],
  };

  const contextPath = path.join(projectPath, ".buildforce", "context");
  const rootIndexPath = path.join(contextPath, "_index.yaml");

  // Check if context folder exists
  if (!(await fs.pathExists(contextPath))) {
    result.skipped = true;
    result.actions.push("No .buildforce/context/ folder found - skipping migration");
    return result;
  }

  // Check root _index.yaml version
  if (!(await fs.pathExists(rootIndexPath))) {
    result.skipped = true;
    result.actions.push("No root _index.yaml found - skipping migration");
    return result;
  }

  let rootIndex: any;
  try {
    const indexContent = await fs.readFile(rootIndexPath, "utf8");
    rootIndex = YAML.parse(indexContent);
  } catch (e: any) {
    result.errors.push(`Error reading _index.yaml: ${e.message}`);
    return result;
  }

  const currentVersion = rootIndex?.version;

  // Already at 2.1 or higher - skip
  if (currentVersion === "2.1") {
    result.skipped = true;
    result.actions.push("Already at version 2.1 - skipping migration");
    return result;
  }

  // Check if this looks like a v1.0 project (no context_types field, has contexts array)
  if (!currentVersion || (rootIndex.contexts && !rootIndex.context_types)) {
    result.skipped = true;
    result.actions.push("Project appears to be v1.0 - run v1.0 → v2.0 migration first");
    return result;
  }

  // Check for domain-specific _index.yaml files (v2.0 indicator)
  const archIndexPath = path.join(contextPath, "architecture", "_index.yaml");
  const convIndexPath = path.join(contextPath, "conventions", "_index.yaml");
  const verIndexPath = path.join(contextPath, "verification", "_index.yaml");

  const archIndexExists = await fs.pathExists(archIndexPath);
  const convIndexExists = await fs.pathExists(convIndexPath);
  const verIndexExists = await fs.pathExists(verIndexPath);

  // If no domain _index.yaml files exist, this is a direct v1.0 → v2.1 path
  // Just need to update the root _index.yaml to v2.1 format
  const hasDomainIndexes = archIndexExists || convIndexExists || verIndexExists;

  try {
    // Initialize the v2.1 structure
    const today = getTodayDate();
    const v21Index: any = {
      version: "2.1",
      type: "context-index",
      generated_at: null,
      last_updated: today,
      codebase_profile: {
        languages: [],
        frameworks: [],
        project_type: null,
        scale: null,
      },
      domains: {
        structural: {
          description: "Structural context about WHAT exists in the codebase.",
          schema: "architecture/_schema.yaml",
          coverage: 0,
          average_depth: "none",
          items: [],
        },
        conventions: {
          description: "Convention context about HOW things are done here.",
          schema: "conventions/_schema.yaml",
          coverage: 0,
          average_depth: "none",
          items: [],
        },
        verification: {
          description: "Verification context about HOW to know if code is right.",
          schema: "verification/_schema.yaml",
          coverage: 0,
          average_depth: "none",
          items: [],
        },
      },
      summary: {
        overall_coverage: 0,
        total_items: 0,
        extracted_items: 0,
        iterations_completed: 0,
      },
      extraction: {
        needs_clarification: [],
        recommended_focus: [],
        new_discoveries: [],
      },
    };

    let totalEntriesMigrated = 0;

    // Migrate entries from domain-specific _index.yaml files if they exist
    if (hasDomainIndexes) {
      // Migrate architecture/_index.yaml entries
      if (archIndexExists) {
        try {
          const archContent = await fs.readFile(archIndexPath, "utf8");
          const archIndex = YAML.parse(archContent);

          if (archIndex?.contexts && Array.isArray(archIndex.contexts)) {
            for (const entry of archIndex.contexts as V20DomainEntry[]) {
              // Preserve original structure, add status/depth for coverage map
              const item: DomainItem = {
                id: entry.id,
                file: entry.file,
                type: entry.type || "structural",
                status: "extracted", // Existing entries are already extracted
                depth: "shallow", // Assume shallow for migrated entries
              };
              // Preserve optional fields
              if (entry.description) item.description = entry.description;
              if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
              if (entry.related_context && entry.related_context.length > 0) {
                item.related_context = entry.related_context;
              }
              v21Index.domains.structural.items.push(item);
              totalEntriesMigrated++;
            }
            result.actions.push(
              `Migrated ${archIndex.contexts.length} entries from architecture/_index.yaml`
            );
          }

          // Delete the domain _index.yaml
          await fs.remove(archIndexPath);
          result.actions.push("Deleted architecture/_index.yaml");
        } catch (e: any) {
          result.errors.push(`Error migrating architecture/_index.yaml: ${e.message}`);
        }
      }

      // Migrate conventions/_index.yaml entries
      if (convIndexExists) {
        try {
          const convContent = await fs.readFile(convIndexPath, "utf8");
          const convIndex = YAML.parse(convContent);

          if (convIndex?.contexts && Array.isArray(convIndex.contexts)) {
            for (const entry of convIndex.contexts as V20DomainEntry[]) {
              // Preserve original structure, add status/depth for coverage map
              const item: DomainItem = {
                id: entry.id,
                file: entry.file,
                type: entry.type || "convention",
                status: "extracted",
                depth: "shallow",
              };
              // Preserve optional fields
              if (entry.description) item.description = entry.description;
              if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
              if (entry.related_context && entry.related_context.length > 0) {
                item.related_context = entry.related_context;
              }
              // Convention-specific fields
              if (entry.sub_type) item.sub_type = entry.sub_type;
              if (entry.enforcement) item.enforcement = entry.enforcement;
              v21Index.domains.conventions.items.push(item);
              totalEntriesMigrated++;
            }
            result.actions.push(
              `Migrated ${convIndex.contexts.length} entries from conventions/_index.yaml`
            );
          }

          // Delete the domain _index.yaml
          await fs.remove(convIndexPath);
          result.actions.push("Deleted conventions/_index.yaml");
        } catch (e: any) {
          result.errors.push(`Error migrating conventions/_index.yaml: ${e.message}`);
        }
      }

      // Migrate verification/_index.yaml entries
      if (verIndexExists) {
        try {
          const verContent = await fs.readFile(verIndexPath, "utf8");
          const verIndex = YAML.parse(verContent);

          if (verIndex?.contexts && Array.isArray(verIndex.contexts)) {
            for (const entry of verIndex.contexts as V20DomainEntry[]) {
              // Preserve original structure, add status/depth for coverage map
              const item: DomainItem = {
                id: entry.id,
                file: entry.file,
                type: entry.type || "verification",
                status: "extracted",
                depth: "shallow",
              };
              // Preserve optional fields
              if (entry.description) item.description = entry.description;
              if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
              if (entry.related_context && entry.related_context.length > 0) {
                item.related_context = entry.related_context;
              }
              // Verification-specific fields
              if (entry.source) item.source = entry.source;
              v21Index.domains.verification.items.push(item);
              totalEntriesMigrated++;
            }
            result.actions.push(
              `Migrated ${verIndex.contexts.length} entries from verification/_index.yaml`
            );
          }

          // Delete the domain _index.yaml
          await fs.remove(verIndexPath);
          result.actions.push("Deleted verification/_index.yaml");
        } catch (e: any) {
          result.errors.push(`Error migrating verification/_index.yaml: ${e.message}`);
        }
      }
    }

    // Update summary counts with migrated item counts
    // NOTE: Coverage percentages are NOT calculated here - they are set to 0
    // because coverage can only be meaningfully calculated by /buildforce.extract
    // after analyzing the actual codebase. Migrated entries count as "existing"
    // but don't represent coverage of the codebase.
    v21Index.summary.total_items = totalEntriesMigrated;
    v21Index.summary.extracted_items = totalEntriesMigrated;

    // Coverage percentages remain at 0 - will be calculated by /extract
    // The items are migrated but coverage requires codebase analysis
    // Domain coverage and average_depth also remain at their initial 0/"none" values

    // Write the updated root _index.yaml
    const yamlContent = YAML.stringify(v21Index, {
      indent: 2,
      lineWidth: 0, // Disable line wrapping
    });

    // Add header comment
    const header = `# Buildforce Context Repository Index & Coverage Map
# This file serves as both the context index AND the extraction coverage map.
# Version 2.1: Unified structure with domain items tracking for /buildforce.extract

`;
    await fs.writeFile(rootIndexPath, header + yamlContent, "utf8");
    result.actions.push("Updated root _index.yaml to version 2.1 format");

    if (totalEntriesMigrated > 0) {
      result.actions.push(
        `Total entries migrated to domains.*.items[]: ${totalEntriesMigrated}`
      );
    }

    result.migrated = true;
  } catch (e: any) {
    result.errors.push(`Migration error: ${e.message}`);
  }

  return result;
}
