import { Command } from "nest-commander";
import { Injectable } from "@nestjs/common";
import { MigrationService } from "../setup/migration.service";
import { BaseCommand } from "../setup/base-command";
import { ConnectionCheckerService } from "../setup/connection-checker.service";
import { getAvailableMigrations } from "../setup/migration-loader";

@Injectable()
@Command({
  name: "migrate",
  description: "Apply pending migrations",
  options: { isDefault: false },
})
export class MigrateCommand extends BaseCommand {
  constructor(
    private readonly migrationService: MigrationService,
    connectionChecker: ConnectionCheckerService,
  ) {
    super(connectionChecker);
  }

  async run(): Promise<void> {
    try {
      if (!(await this.performConnectionCheck())) {
        this.logger.error("❌ Connection check failed. Exiting.");
        process.exit(1);
      }

      const availableMigrations = await getAvailableMigrations();
      if (availableMigrations.length === 0) {
        this.logger.log("ℹ️ No migrations found");
        return;
      }

      const result = await this.migrationService.migrate(availableMigrations);

      if (result.success) {
        this.logger.log(`✅ ${result.message}`);
      } else {
        this.logger.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      this.logger.error("Migration command failed:", error);
      process.exit(1);
    }
  }
}
