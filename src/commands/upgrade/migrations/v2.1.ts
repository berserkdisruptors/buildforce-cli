import fs from "fs-extra";
import path from "path";
import YAML, { Document, YAMLSeq } from "yaml";
import { Migration, MigrationResult, getTodayDate } from "./index.js";

/**
 * Item entry for v2.1 unified _index.yaml domains
 */
interface DomainItem {
  id: string;
  file: string;
  type: string;
  description?: string;
  tags?: string[];
  related_context?: string[];
  status: "discovered" | "in-progress" | "extracted";
  depth: "none" | "shallow" | "moderate" | "deep";
  sub_type?: string;
  enforcement?: string;
  source?: string;
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
 * Migration to v2.1
 *
 * Migrates context structure from v2.0 to v2.1:
 * 1. Reads entries from architecture/_index.yaml, conventions/_index.yaml, verification/_index.yaml
 * 2. Converts entries to domains.*.items[] format in root _index.yaml
 * 3. Deletes domain-specific _index.yaml files
 * 4. Updates root _index.yaml version to 2.1
 *
 * Handles both:
 *   - v1.0 → v2.1 (direct): No domain _index.yaml files exist, just update version
 *   - v2.0 → v2.1 (entry migration): Migrate entries from domain _index.yaml files
 */
export const migration21: Migration = {
  version: "2.1",
  description: "Migrate to v2.1 unified coverage map (consolidate domain indexes into root)",

  async execute(projectPath: string, templateSourceDir: string): Promise<MigrationResult> {
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

    // Check if this looks like a v1.0 project
    if (!currentVersion || (rootIndex.contexts && !rootIndex.context_types)) {
      result.skipped = true;
      result.actions.push("Project appears to be v1.0 - run v2.0 migration first");
      return result;
    }

    // Check for domain-specific _index.yaml files (v2.0 indicator)
    const archIndexPath = path.join(contextPath, "architecture", "_index.yaml");
    const convIndexPath = path.join(contextPath, "conventions", "_index.yaml");
    const verIndexPath = path.join(contextPath, "verification", "_index.yaml");

    const archIndexExists = await fs.pathExists(archIndexPath);
    const convIndexExists = await fs.pathExists(convIndexPath);
    const verIndexExists = await fs.pathExists(verIndexPath);

    const hasDomainIndexes = archIndexExists || convIndexExists || verIndexExists;

    try {
      const today = getTodayDate();

      // Load the v2.1 template from source - this preserves all comments and formatting
      // In release packages, the template is at .buildforce/context/_index.yaml
      const templatePath = path.join(templateSourceDir, ".buildforce", "context", "_index.yaml");
      let templateContent: string;
      let doc: Document;

      if (await fs.pathExists(templatePath)) {
        templateContent = await fs.readFile(templatePath, "utf8");
        // Use parseDocument to preserve comments
        doc = YAML.parseDocument(templateContent);
      } else {
        // Fallback: create minimal structure if template not found
        result.errors.push("Template src/context/_index.yaml not found - using minimal structure");
        doc = new Document({
          version: "2.1",
          generated_at: null,
          last_updated: today,
          codebase_profile: { languages: [], frameworks: [], project_type: null, scale: null },
          domains: {
            structural: { description: "Structural context.", schema: "architecture/_schema.yaml", coverage: 0, average_depth: "none", items: [] },
            conventions: { description: "Convention context.", schema: "conventions/_schema.yaml", coverage: 0, average_depth: "none", items: [] },
            verification: { description: "Verification context.", schema: "verification/_schema.yaml", coverage: 0, average_depth: "none", items: [] },
          },
          summary: { overall_coverage: 0, total_items: 0, extracted_items: 0, iterations_completed: 0 },
          extraction: { needs_clarification: [], recommended_focus: [], new_discoveries: [] },
        });
      }

      // Update last_updated
      doc.setIn(["last_updated"], today);

      // Collect migrated items for each domain
      const structuralItems: DomainItem[] = [];
      const conventionItems: DomainItem[] = [];
      const verificationItems: DomainItem[] = [];
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
                // Prefix file path with architecture/ folder
                const filePath = entry.file.startsWith("architecture/")
                  ? entry.file
                  : `architecture/${entry.file}`;
                const item: DomainItem = {
                  id: entry.id,
                  file: filePath,
                  type: entry.type || "structural",
                  status: "extracted",
                  depth: "shallow",
                };
                if (entry.description) item.description = entry.description;
                if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
                if (entry.related_context && entry.related_context.length > 0) {
                  item.related_context = entry.related_context;
                }
                structuralItems.push(item);
                totalEntriesMigrated++;
              }
              result.actions.push(
                `Migrated ${archIndex.contexts.length} entries from architecture/_index.yaml`
              );
            }

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
                // Prefix file path with conventions/ folder
                const filePath = entry.file.startsWith("conventions/")
                  ? entry.file
                  : `conventions/${entry.file}`;
                const item: DomainItem = {
                  id: entry.id,
                  file: filePath,
                  type: entry.type || "convention",
                  status: "extracted",
                  depth: "shallow",
                };
                if (entry.description) item.description = entry.description;
                if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
                if (entry.related_context && entry.related_context.length > 0) {
                  item.related_context = entry.related_context;
                }
                if (entry.sub_type) item.sub_type = entry.sub_type;
                if (entry.enforcement) item.enforcement = entry.enforcement;
                conventionItems.push(item);
                totalEntriesMigrated++;
              }
              result.actions.push(
                `Migrated ${convIndex.contexts.length} entries from conventions/_index.yaml`
              );
            }

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
                // Prefix file path with verification/ folder
                const filePath = entry.file.startsWith("verification/")
                  ? entry.file
                  : `verification/${entry.file}`;
                const item: DomainItem = {
                  id: entry.id,
                  file: filePath,
                  type: entry.type || "verification",
                  status: "extracted",
                  depth: "shallow",
                };
                if (entry.description) item.description = entry.description;
                if (entry.tags && entry.tags.length > 0) item.tags = entry.tags;
                if (entry.related_context && entry.related_context.length > 0) {
                  item.related_context = entry.related_context;
                }
                if (entry.source) item.source = entry.source;
                verificationItems.push(item);
                totalEntriesMigrated++;
              }
              result.actions.push(
                `Migrated ${verIndex.contexts.length} entries from verification/_index.yaml`
              );
            }

            await fs.remove(verIndexPath);
            result.actions.push("Deleted verification/_index.yaml");
          } catch (e: any) {
            result.errors.push(`Error migrating verification/_index.yaml: ${e.message}`);
          }
        }
      }

      // Update the document with migrated items
      // Create items sequences with proper formatting
      const createItemsSeq = (items: DomainItem[]): YAMLSeq => {
        const seq = new YAMLSeq();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemDoc = doc.createNode(item);
          if (i > 0) {
            // Add blank line before each item (except first)
            (itemDoc as any).spaceBefore = true;
          }
          seq.add(itemDoc);
        }
        return seq;
      };

      // Set items arrays in document
      if (structuralItems.length > 0) {
        doc.setIn(["domains", "structural", "items"], createItemsSeq(structuralItems));
      }
      if (conventionItems.length > 0) {
        doc.setIn(["domains", "conventions", "items"], createItemsSeq(conventionItems));
      }
      if (verificationItems.length > 0) {
        doc.setIn(["domains", "verification", "items"], createItemsSeq(verificationItems));
      }

      // Update summary counts
      doc.setIn(["summary", "total_items"], totalEntriesMigrated);
      doc.setIn(["summary", "extracted_items"], totalEntriesMigrated);

      // Set flow style for arrays that should be inline: tags, related_context, languages, frameworks, etc.
      YAML.visit(doc, {
        Pair(_, pair) {
          const key = pair.key;
          if (key && typeof key === "object" && "value" in key) {
            const keyValue = key.value;
            if (
              keyValue === "tags" ||
              keyValue === "related_context" ||
              keyValue === "languages" ||
              keyValue === "frameworks" ||
              keyValue === "needs_clarification" ||
              keyValue === "recommended_focus" ||
              keyValue === "new_discoveries"
            ) {
              if (pair.value && pair.value instanceof YAMLSeq) {
                pair.value.flow = true;
              }
            }
          }
        },
      });

      // Write to file - template already has all comments preserved
      const yamlContent = doc.toString({ lineWidth: 0 });
      await fs.writeFile(rootIndexPath, yamlContent, "utf8");
      result.actions.push("Updated root _index.yaml to version 2.1 format (preserving template comments)");

      if (totalEntriesMigrated > 0) {
        result.actions.push(`Total entries migrated to domains.*.items[]: ${totalEntriesMigrated}`);
      }

      result.migrated = true;
    } catch (e: any) {
      result.errors.push(`Migration error: ${e.message}`);
    }

    return result;
  },
};
