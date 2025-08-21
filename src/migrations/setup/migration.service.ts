import { Injectable, Logger } from '@nestjs/common';
import { Database } from 'arangojs';
import { Migration, MigrationRecord, MigrationResult } from './types';
import settings from '../../settings';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private db: Database;

  constructor() {
    this.db = new Database({
      url: settings.arango.url,
      databaseName: settings.arango.database,
      auth: {
        username: settings.arango.username,
        password: settings.arango.password,
      },
    });
  }

  private async ensureMigrationsCollection(): Promise<void> {
    const collection = this.db.collection('migrations');
    if (!(await collection.exists())) {
      await this.db.createCollection('migrations');
    }
  }

  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsCollection();
    const cursor = await this.db.query('FOR doc IN migrations RETURN doc');
    return await cursor.all();
  }

  private async markMigrationAsApplied(migration: Migration): Promise<void> {
    const collection = this.db.collection('migrations');
    await collection.save({
      migration_id: migration.id,
      name: migration.name,
      timestamp: migration.timestamp,
      applied_at: new Date().toISOString(),
    });
  }

  private async markMigrationAsReverted(migrationId: string): Promise<void> {
    const cursor = await this.db.query(
      'FOR doc IN migrations FILTER doc.migration_id == @migrationId REMOVE doc IN migrations',
      { migrationId }
    );
    await cursor.next();
  }

  async migrate(availableMigrations: Migration[]): Promise<MigrationResult> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedIds = new Set(appliedMigrations.map(m => m.migration_id));
      
      const pendingMigrations = availableMigrations
        .filter(m => !appliedIds.has(m.id))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (pendingMigrations.length === 0) {
        return {
          success: true,
          message: 'No pending migrations to apply',
          appliedMigrations: [],
        };
      }

      const applied: string[] = [];

      for (const migration of pendingMigrations) {
        await migration.up();
        await this.markMigrationAsApplied(migration);
        applied.push(migration.name);
      }

      return {
        success: true,
        message: `Successfully applied ${applied.length} migrations`,
        appliedMigrations: applied,
      };
    } catch (error) {
      this.logger.error('Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
      };
    }
  }

  async rollback(availableMigrations: Migration[], count: number = 1): Promise<MigrationResult> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        return {
          success: true,
          message: 'No migrations to rollback',
          revertedMigrations: [],
        };
      }

      const migrationsToRevert = appliedMigrations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, count);

      const reverted: string[] = [];

      for (const record of migrationsToRevert) {
        const migration = availableMigrations.find(m => m.id === record.migration_id);
        if (!migration) continue;
        
        await migration.down();
        await this.markMigrationAsReverted(record.migration_id);
        reverted.push(migration.name);
      }

      return {
        success: true,
        message: `Successfully rolled back ${reverted.length} migrations`,
        revertedMigrations: reverted,
      };
    } catch (error) {
      this.logger.error('Rollback failed:', error);
      return {
        success: false,
        message: `Rollback failed: ${error.message}`,
      };
    }
  }

  async status(availableMigrations: Migration[]): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.migration_id));

    for (const migration of availableMigrations.sort((a, b) => a.timestamp - b.timestamp)) {
      const isApplied = appliedIds.has(migration.id);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`${status} ${migration.name} (${migration.id})`);
    }
  }
} 