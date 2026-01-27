import { Migration, MigrationResult, compareVersions, getCurrentVersion } from "./index.js";

/**
 * Result of running all applicable migrations
 */
export interface MigrationRunnerResult {
  /** Whether any migrations were executed */
  migrated: boolean;
  /** True if already at latest version */
  alreadyLatest: boolean;
  /** Starting version before migrations */
  fromVersion: string | null;
  /** Final version after migrations */
  toVersion: string;
  /** List of migrations that were applied */
  appliedMigrations: string[];
  /** Combined actions from all migrations */
  actions: string[];
  /** Combined errors from all migrations */
  errors: string[];
}

/**
 * Migration Runner
 *
 * Executes context migrations sequentially based on version ordering.
 * Unlike database migrations that require tracking tables and timestamps,
 * we simply check the current version and run all migrations that target
 * a higher version than the current one.
 *
 * Example flow:
 * - User on v1.0, migrations available: [v2.0, v2.1, v3.0]
 * - Runner detects v1.0, runs v2.0, v2.1, v3.0 in order
 * - Each migration updates _index.yaml version field
 */
export class MigrationRunner {
  private migrations: Migration[] = [];

  /**
   * Register a migration
   * Migrations should be registered in version order
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    // Keep migrations sorted by version
    this.migrations.sort((a, b) => compareVersions(a.version, b.version));
  }

  /**
   * Get the latest version this runner can migrate to
   */
  getLatestVersion(): string {
    if (this.migrations.length === 0) {
      return "1.0";
    }
    return this.migrations[this.migrations.length - 1].version;
  }

  /**
   * Get migrations that need to be applied for a given current version
   */
  getMigrationsToApply(currentVersion: string | null): Migration[] {
    const effectiveVersion = currentVersion || "1.0";
    return this.migrations.filter(
      (m) => compareVersions(m.version, effectiveVersion) > 0
    );
  }

  /**
   * Run all applicable migrations for a project
   */
  async run(
    projectPath: string,
    templateSourceDir: string
  ): Promise<MigrationRunnerResult> {
    const result: MigrationRunnerResult = {
      migrated: false,
      alreadyLatest: false,
      fromVersion: null,
      toVersion: "1.0",
      appliedMigrations: [],
      actions: [],
      errors: [],
    };

    // Get current version
    const currentVersion = await getCurrentVersion(projectPath);
    result.fromVersion = currentVersion;

    // Determine which migrations to run
    const toApply = this.getMigrationsToApply(currentVersion);

    if (toApply.length === 0) {
      result.alreadyLatest = true;
      result.toVersion = currentVersion || this.getLatestVersion();
      result.actions.push(
        `Already at version ${result.toVersion} - no migrations needed`
      );
      return result;
    }

    // Run migrations sequentially
    for (const migration of toApply) {
      try {
        const migrationResult = await migration.execute(
          projectPath,
          templateSourceDir
        );

        if (migrationResult.migrated) {
          result.migrated = true;
          result.appliedMigrations.push(migration.version);
          result.actions.push(
            `v${migration.version}: ${migration.description}`
          );
          result.actions.push(...migrationResult.actions.map((a) => `  - ${a}`));
        } else if (migrationResult.skipped) {
          result.actions.push(
            `v${migration.version}: skipped - ${migrationResult.actions[0] || "already applied"}`
          );
        }

        if (migrationResult.errors.length > 0) {
          result.errors.push(
            ...migrationResult.errors.map((e) => `v${migration.version}: ${e}`)
          );
        }

        result.toVersion = migration.version;
      } catch (error: any) {
        result.errors.push(
          `v${migration.version}: Migration failed - ${error.message}`
        );
        // Stop on first failure
        break;
      }
    }

    return result;
  }
}
