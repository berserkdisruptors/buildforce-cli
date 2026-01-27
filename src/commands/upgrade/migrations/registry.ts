import { MigrationRunner } from "./runner.js";
import { migration20 } from "./v2.0.js";
import { migration21 } from "./v2.1.js";

/**
 * Create and configure the migration runner with all available migrations
 *
 * To add a new migration:
 * 1. Create a new file: src/commands/upgrade/migrations/v{version}.ts
 * 2. Export a Migration object with version, description, and execute function
 * 3. Import and register the migration here
 *
 * Migrations are automatically sorted by version and executed sequentially.
 * The runner determines which migrations to apply based on the current version.
 */
export function createMigrationRunner(): MigrationRunner {
  const runner = new MigrationRunner();

  // Register all migrations in order
  // NOTE: Migrations are auto-sorted by version, but registering in order is clearer
  runner.register(migration20);
  runner.register(migration21);

  // Future migrations:
  // runner.register(migration30);
  // runner.register(migration31);

  return runner;
}

// Re-export for convenience
export { MigrationRunner, MigrationRunnerResult } from "./runner.js";
export { Migration, MigrationResult, getCurrentVersion, compareVersions } from "./index.js";
