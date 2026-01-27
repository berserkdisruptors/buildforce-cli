import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import { Migration, MigrationResult, getTodayDate } from "./index.js";

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
 * Format a string value for YAML output
 */
function formatYamlValue(value: string, _indent: number = 0): string {
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

/**
 * Serialize an _index.yaml file with proper formatting
 */
function serializeIndexFile<T>(
  existingContent: string | null,
  entries: T[],
  entrySerializer: (entry: T) => string[],
  fallbackHeader: string = 'version: "2.0"\n\n'
): string {
  const entriesYaml = entries
    .map((entry) => entrySerializer(entry).map((line) => "  " + line).join("\n"))
    .join("\n\n");

  if (existingContent) {
    const contextsMatch = existingContent.match(/^([\s\S]*?)(contexts:\s*\[?\]?\s*)$/m);
    if (contextsMatch) {
      const header = contextsMatch[1];
      return header + "contexts:\n" + entriesYaml + "\n";
    }
  }

  return fallbackHeader + "contexts:\n" + entriesYaml + "\n";
}

/**
 * Serialize a convention file to YAML
 */
function serializeConventionFile(convention: NewConventionFile): string {
  const lines: string[] = [];

  lines.push(`id: ${convention.id}`);
  lines.push(`name: "${convention.name}"`);
  lines.push(`type: ${convention.type}`);
  lines.push(`sub_type: ${convention.sub_type}`);
  lines.push(`enforcement: ${convention.enforcement}`);
  lines.push(`created: "${convention.created}"`);
  lines.push(`last_updated: "${convention.last_updated}"`);
  lines.push("");
  lines.push(`description: ${formatYamlValue(convention.description, 0)}`);

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
 * Convert a string to kebab-case
 */
function toKebabCase(str: string): string {
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
 * Convert an old convention item to new format
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
 * Process naming conventions
 */
function processNamingConventions(
  namingData: OldConventionItem | OldConventionItem[],
  todayDate: string
): NewConventionFile[] {
  const conventions: NewConventionFile[] = [];

  if (
    !Array.isArray(namingData) &&
    (namingData.files || namingData.variables || namingData.constants || namingData.functions)
  ) {
    const description = [];

    if (namingData.files && Array.isArray(namingData.files)) {
      description.push("Files:\n" + namingData.files.map((f) => `  - ${f}`).join("\n"));
    }
    if (namingData.variables && Array.isArray(namingData.variables)) {
      description.push("Variables:\n" + namingData.variables.map((v) => `  - ${v}`).join("\n"));
    }
    if (namingData.constants && Array.isArray(namingData.constants)) {
      description.push("Constants:\n" + namingData.constants.map((c) => `  - ${c}`).join("\n"));
    }
    if (namingData.functions && Array.isArray(namingData.functions)) {
      description.push("Functions:\n" + namingData.functions.map((f) => `  - ${f}`).join("\n"));
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
  } else if (Array.isArray(namingData)) {
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
 * Migrate _guidelines.yaml to individual convention files
 */
async function migrateGuidelinesFile(
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

    const allConventions: NewConventionFile[] = [];

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

    if (guidelines.naming_conventions) {
      const namingConventions = processNamingConventions(guidelines.naming_conventions, todayDate);
      allConventions.push(...namingConventions);
    }

    for (const convention of allConventions) {
      const filename = `${convention.id}.yaml`;
      const filePath = path.join(conventionsPath, filename);

      if (await fs.pathExists(filePath)) {
        result.errors.push(`Skipping ${filename} - file already exists`);
        continue;
      }

      const yamlContent = serializeConventionFile(convention);
      await fs.writeFile(filePath, yamlContent, "utf8");
      result.files.push(filename);
    }

    const indexPath = path.join(conventionsPath, "_index.yaml");
    if (await fs.pathExists(indexPath)) {
      try {
        const indexContent = await fs.readFile(indexPath, "utf8");
        const index = YAML.parse(indexContent);

        if (index && typeof index === "object") {
          if (!Array.isArray(index.contexts)) {
            index.contexts = [];
          }

          for (const convention of allConventions) {
            const exists = index.contexts.some((ctx: { id?: string }) => ctx.id === convention.id);
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
 * Migrate context files to architecture folder
 */
async function migrateContextFilesToArchitecture(
  contextPath: string,
  architecturePath: string,
  todayDate: string
): Promise<{ files: string[]; errors: string[] }> {
  const result = { files: [] as string[], errors: [] as string[] };

  try {
    const items = await fs.readdir(contextPath);
    const contextFiles = items.filter((item) => {
      if (!item.endsWith(".yaml") && !item.endsWith(".yml")) return false;
      if (item.startsWith("_")) return false;
      return true;
    });

    for (const filename of contextFiles) {
      const sourcePath = path.join(contextPath, filename);
      const destFilename = filename.endsWith(".yml")
        ? filename.replace(/\.yml$/, ".yaml")
        : filename;
      const destPath = path.join(architecturePath, destFilename);

      try {
        const stat = await fs.stat(sourcePath);
        if (stat.isDirectory()) continue;

        if (await fs.pathExists(destPath)) {
          result.errors.push(`Skipping ${filename} - already exists in architecture/`);
          continue;
        }

        let content = await fs.readFile(sourcePath, "utf8");

        const parsed = YAML.parse(content);
        if (!parsed || typeof parsed !== "object") {
          result.errors.push(`Invalid YAML structure in ${filename}`);
          continue;
        }

        const typeRegex = /^(type:\s*)(?:"[^"]*"|'[^']*'|\S+)(\s*)$/m;
        if (typeRegex.test(content)) {
          content = content.replace(typeRegex, `$1structural$2`);
        }

        const lastUpdatedRegex = /^(last_updated:\s*)(?:"[^"]*"|'[^']*'|\S+)(\s*)$/m;
        if (lastUpdatedRegex.test(content)) {
          content = content.replace(lastUpdatedRegex, `$1"${todayDate}"$2`);
        }

        await fs.writeFile(destPath, content, "utf8");
        await fs.remove(sourcePath);
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
 * Migrate index entries to architecture
 */
async function migrateIndexEntriesToArchitecture(
  rootIndexPath: string,
  archIndexPath: string
): Promise<{ entries: number; errors: string[] }> {
  const result = { entries: 0, errors: [] as string[] };

  try {
    if (!(await fs.pathExists(rootIndexPath))) {
      return result;
    }

    const rootContent = await fs.readFile(rootIndexPath, "utf8");
    const rootIndex = YAML.parse(rootContent);

    if (!rootIndex || !Array.isArray(rootIndex.contexts)) {
      return result;
    }

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

    for (const entry of rootIndex.contexts as OldIndexEntry[]) {
      if (entry.file === "_guidelines.yaml" || entry.id === "guidelines") {
        continue;
      }

      const exists = archIndex.contexts.some((ctx) => ctx.id === entry.id);
      if (exists) {
        result.errors.push(`Skipping entry ${entry.id} - already exists in architecture/_index.yaml`);
        continue;
      }

      const normalizedFile = entry.file.endsWith(".yml")
        ? entry.file.replace(/\.yml$/, ".yaml")
        : entry.file;

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
        newEntry.related_context = entry.related_context.filter((ref) => ref !== "guidelines");
      }

      archIndex.contexts.push(newEntry);
      result.entries++;
    }

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
 * Migration to v2.0
 *
 * Migrates context structure from v1.0 to v2.0:
 * 1. Creates architecture/, conventions/, verification/ folders with schemas
 * 2. Breaks down _guidelines.yaml into individual convention files
 * 3. Migrates existing context files to architecture/ with type="structural"
 * 4. Updates root _index.yaml to version 2.0
 */
export const migration20: Migration = {
  version: "2.0",
  description: "Migrate to v2.0 taxonomy (architecture/conventions/verification structure)",

  async execute(projectPath: string, templateSourceDir: string): Promise<MigrationResult> {
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

        if (version === "2.0" || version === "2.1") {
          result.skipped = true;
          result.actions.push(`Already at version ${version} - skipping v2.0 migration`);
          return result;
        }
      } catch (e: any) {
        result.errors.push(`Error reading _index.yaml: ${e.message}`);
      }
    }

    // Perform migration
    try {
      const architecturePath = path.join(contextPath, "architecture");
      const conventionsPath = path.join(contextPath, "conventions");
      const verificationPath = path.join(contextPath, "verification");

      const archExists = await fs.pathExists(architecturePath);
      const convExists = await fs.pathExists(conventionsPath);
      const verExists = await fs.pathExists(verificationPath);

      if (archExists && convExists && verExists) {
        const archIndexExists = await fs.pathExists(path.join(architecturePath, "_index.yaml"));
        const convIndexExists = await fs.pathExists(path.join(conventionsPath, "_index.yaml"));
        const verIndexExists = await fs.pathExists(path.join(verificationPath, "_index.yaml"));

        if (archIndexExists && convIndexExists && verIndexExists) {
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
      const templateContextPath = path.join(templateSourceDir, ".buildforce", "context");

      // Copy architecture schema and index
      const archSchemaTemplatePath = path.join(templateContextPath, "architecture", "_schema.yaml");
      const archIndexTemplatePath = path.join(templateContextPath, "architecture", "_index.yaml");
      if (await fs.pathExists(archSchemaTemplatePath)) {
        await fs.copy(archSchemaTemplatePath, path.join(architecturePath, "_schema.yaml"));
        result.actions.push("Copied architecture/_schema.yaml from template");
      }
      if (await fs.pathExists(archIndexTemplatePath)) {
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
        const guidelinesResult = await migrateGuidelinesFile(guidelinesPath, conventionsPath, todayDate);

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

        if (guidelinesResult.files.length > 0) {
          await fs.remove(guidelinesPath);
          result.actions.push("Deleted original _guidelines.yaml after successful migration");
        }
      } else {
        result.actions.push("No _guidelines.yaml found to migrate");
      }

      // Migrate existing context files to architecture/ folder
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
      const archIndexPath = path.join(architecturePath, "_index.yaml");
      const indexEntriesResult = await migrateIndexEntriesToArchitecture(rootIndexPath, archIndexPath);

      if (indexEntriesResult.entries > 0) {
        result.actions.push(`Migrated ${indexEntriesResult.entries} index entries to architecture/_index.yaml`);
      }

      if (indexEntriesResult.errors.length > 0) {
        result.errors.push(...indexEntriesResult.errors);
      }

      // Copy new root _index.yaml from template
      const rootIndexTemplatePath = path.join(templateContextPath, "_index.yaml");
      if (await fs.pathExists(rootIndexTemplatePath)) {
        await fs.copy(rootIndexTemplatePath, rootIndexPath);
        result.actions.push("Updated root _index.yaml to version 2.0 format");
      }

      // Delete old _schema.yaml from root
      const oldSchemaPath = path.join(contextPath, "_schema.yaml");
      if (await fs.pathExists(oldSchemaPath)) {
        await fs.remove(oldSchemaPath);
        result.actions.push("Removed old root _schema.yaml (now in architecture/)");
      }

      // Delete empty _graph.yaml if it exists
      const graphPath = path.join(contextPath, "_graph.yaml");
      if (await fs.pathExists(graphPath)) {
        const graphContent = await fs.readFile(graphPath, "utf8");
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
  },
};
