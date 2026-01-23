import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

/**
 * Result of the context migration process
 */
export interface MigrationResult {
  migrated: boolean; // Whether migration was performed
  skipped: boolean; // True if already at version 2.0
  actions: string[]; // List of actions taken for logging
  errors: string[]; // Any non-fatal errors encountered
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

      const yamlContent = YAML.stringify(convention, {
        lineWidth: 100,
        defaultKeyType: "PLAIN",
        defaultStringType: "QUOTE_DOUBLE",
      });

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

          await fs.writeFile(indexPath, YAML.stringify(index, { lineWidth: 100 }), "utf8");
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
 * Migrate context structure from version 1.0 to 2.0
 *
 * This function:
 * 1. Checks root _index.yaml version (1.0 → migrate, 2.0 → skip)
 * 2. Creates architecture/, conventions/, verification/ folders with schemas
 * 3. Copies new schema and index files from the template source
 * 4. Breaks down _guidelines.yaml into individual convention files
 * 5. Updates root _index.yaml to version 2.0 directory format
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
    const templateContextPath = path.join(templateSourceDir, "src", "context");

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

      // Backup the old _guidelines.yaml (don't delete it)
      const backupPath = path.join(contextPath, "_guidelines.yaml.v1.bak");
      if (!(await fs.pathExists(backupPath))) {
        await fs.copy(guidelinesPath, backupPath);
        result.actions.push("Backed up _guidelines.yaml to _guidelines.yaml.v1.bak");
      }
    } else {
      result.actions.push("No _guidelines.yaml found to migrate");
    }

    // Backup and update root _index.yaml
    if (await fs.pathExists(rootIndexPath)) {
      const backupPath = path.join(contextPath, "_index.yaml.v1.bak");
      if (!(await fs.pathExists(backupPath))) {
        await fs.copy(rootIndexPath, backupPath);
        result.actions.push("Backed up _index.yaml to _index.yaml.v1.bak");
      }
    }

    // Copy new root _index.yaml from template
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
