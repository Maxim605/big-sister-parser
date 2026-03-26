import { Command } from "nest-commander";
import { Injectable } from "@nestjs/common";
import { MigrationService } from "../setup/migration.service";
import { BaseCommand } from "../setup/base-command";
import { ConnectionCheckerService } from "../setup/connection-checker.service";
import { getAvailableMigrations } from "../setup/migration-loader";

@Injectable()
@Command({
  name: "status",
  description: "Show migration status",
  options: { isDefault: false },
})
export class StatusCommand extends BaseCommand {
  constructor(
    private readonly migrationService: MigrationService,
    connectionChecker: ConnectionCheckerService,
  ) {
    super(connectionChecker);
  }

  async run(): Promise<void> {
    try {
      const availableMigrations = await getAvailableMigrations();
      if (availableMigrations.length === 0) {
        this.logger.log("ℹ️ No migrations found");
        return;
      }

      if (await this.performConnectionCheck()) {
        await this.migrationService.status(availableMigrations);
      } else {
        this.logger.warn(
          "⚠️ Could not connect to database to check applied migrations",
        );
      }
    } catch (error) {
      this.logger.error("Status command failed:", error);
      process.exit(1);
    }
  }
}
