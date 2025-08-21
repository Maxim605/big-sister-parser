import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { MigrationService } from '../setup/migration.service';
import { BaseCommand } from '../setup/base-command';
import { ConnectionCheckerService } from '../setup/connection-checker.service';
import { getAvailableMigrations } from '../setup/migration-loader';

interface RollbackOptions {
  count?: number;
}

@Injectable()
@Command({
  name: 'rollback',
  description: 'Rollback migrations',
  options: { isDefault: false },
})
export class RollbackCommand extends BaseCommand {
  constructor(
    private readonly migrationService: MigrationService,
    connectionChecker: ConnectionCheckerService
  ) {
    super(connectionChecker);
  }

  @Option({
    flags: '-c, --count <number>',
    description: 'Number of migrations to rollback (default: 1)',
  })
  parseCount(val: string): number {
    return parseInt(val, 10);
  }

  async run(passedParams: string[], options?: RollbackOptions): Promise<void> {
    try {
      const count = options?.count || 1;
      if (count <= 0) {
        this.logger.error('❌ Count must be a positive number');
        process.exit(1);
      }

      if (!(await this.performConnectionCheck())) {
        this.logger.error('❌ Connection check failed. Exiting.');
        process.exit(1);
      }
      
      const availableMigrations = await getAvailableMigrations();
      if (availableMigrations.length === 0) {
        this.logger.log('ℹ️ No migrations found');
        return;
      }

      const result = await this.migrationService.rollback(availableMigrations, count);
      
      if (result.success) {
        this.logger.log(`✅ ${result.message}`);
      } else {
        this.logger.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      this.logger.error('Rollback command failed:', error);
      process.exit(1);
    }
  }
} 