import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationRunner } from '../../../../src/commands/upgrade/migrations/runner.js';
import type { Migration, MigrationResult } from '../../../../src/commands/upgrade/migrations/index.js';

// Mock getCurrentVersion
vi.mock('../../../../src/commands/upgrade/migrations/index.js', async () => {
  const actual = await vi.importActual('../../../../src/commands/upgrade/migrations/index.js');
  return {
    ...actual,
    getCurrentVersion: vi.fn().mockResolvedValue('1.0'),
  };
});

function createMockMigration(version: string, opts: Partial<MigrationResult> = {}): Migration {
  return {
    version,
    description: `Migration to v${version}`,
    execute: vi.fn().mockResolvedValue({
      migrated: true,
      skipped: false,
      actions: [`Migrated to ${version}`],
      errors: [],
      ...opts,
    }),
  };
}

describe('MigrationRunner', () => {
  let runner: MigrationRunner;

  beforeEach(() => {
    runner = new MigrationRunner();
  });

  describe('register', () => {
    it('adds migrations and keeps them sorted', () => {
      runner.register(createMockMigration('2.1'));
      runner.register(createMockMigration('2.0'));
      const toApply = runner.getMigrationsToApply('1.0');
      expect(toApply[0].version).toBe('2.0');
      expect(toApply[1].version).toBe('2.1');
    });
  });

  describe('getLatestVersion', () => {
    it('returns 1.0 when no migrations registered', () => {
      expect(runner.getLatestVersion()).toBe('1.0');
    });

    it('returns latest registered version', () => {
      runner.register(createMockMigration('2.0'));
      runner.register(createMockMigration('2.1'));
      expect(runner.getLatestVersion()).toBe('2.1');
    });
  });

  describe('getMigrationsToApply', () => {
    it('returns all migrations when current is null', () => {
      runner.register(createMockMigration('2.0'));
      runner.register(createMockMigration('2.1'));
      const toApply = runner.getMigrationsToApply(null);
      expect(toApply).toHaveLength(2);
    });

    it('returns migrations after current version', () => {
      runner.register(createMockMigration('2.0'));
      runner.register(createMockMigration('2.1'));
      runner.register(createMockMigration('3.0'));
      const toApply = runner.getMigrationsToApply('2.0');
      expect(toApply).toHaveLength(2);
      expect(toApply[0].version).toBe('2.1');
      expect(toApply[1].version).toBe('3.0');
    });

    it('returns empty array when already at latest', () => {
      runner.register(createMockMigration('2.0'));
      const toApply = runner.getMigrationsToApply('2.0');
      expect(toApply).toHaveLength(0);
    });

    it('returns empty array when past all migrations', () => {
      runner.register(createMockMigration('2.0'));
      const toApply = runner.getMigrationsToApply('3.0');
      expect(toApply).toHaveLength(0);
    });
  });

  describe('run', () => {
    it('sets alreadyLatest when no migrations to apply', async () => {
      const result = await runner.run('/project', '/templates');
      expect(result.alreadyLatest).toBe(true);
      expect(result.migrated).toBe(false);
    });

    it('runs applicable migrations sequentially', async () => {
      const m20 = createMockMigration('2.0');
      const m21 = createMockMigration('2.1');
      runner.register(m20);
      runner.register(m21);

      const result = await runner.run('/project', '/templates');
      expect(result.migrated).toBe(true);
      expect(result.appliedMigrations).toEqual(['2.0', '2.1']);
      expect(m20.execute).toHaveBeenCalledWith('/project', '/templates');
      expect(m21.execute).toHaveBeenCalledWith('/project', '/templates');
    });

    it('records actions from all migrations', async () => {
      runner.register(createMockMigration('2.0'));
      runner.register(createMockMigration('2.1'));

      const result = await runner.run('/project', '/templates');
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('sets toVersion to last applied migration', async () => {
      runner.register(createMockMigration('2.0'));
      runner.register(createMockMigration('2.1'));

      const result = await runner.run('/project', '/templates');
      expect(result.toVersion).toBe('2.1');
    });

    it('handles skipped migrations', async () => {
      runner.register(createMockMigration('2.0', { migrated: false, skipped: true, actions: ['already applied'] }));

      const result = await runner.run('/project', '/templates');
      expect(result.migrated).toBe(false);
    });

    it('stops on first migration failure', async () => {
      const m20: Migration = {
        version: '2.0',
        description: 'v2.0',
        execute: vi.fn().mockRejectedValue(new Error('Migration failed')),
      };
      const m21 = createMockMigration('2.1');
      runner.register(m20);
      runner.register(m21);

      const result = await runner.run('/project', '/templates');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Migration failed');
      expect(m21.execute).not.toHaveBeenCalled();
    });

    it('collects errors from migrations', async () => {
      runner.register(createMockMigration('2.0', { errors: ['Warning: something'] }));

      const result = await runner.run('/project', '/templates');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Warning: something');
    });

    it('sets fromVersion from getCurrentVersion', async () => {
      runner.register(createMockMigration('2.0'));
      const result = await runner.run('/project', '/templates');
      expect(result.fromVersion).toBe('1.0');
    });
  });
});
