import { Module } from "@nestjs/common";
import { MigrationService } from "../setup/migration.service";
import { ConnectionCheckerService } from "./connection-checker.service";
import { MigrateCommand } from "../commands/migrate.command";
import { RollbackCommand } from "../commands/rollback.command";
import { StatusCommand } from "../commands/status.command";

@Module({
  providers: [
    MigrationService,
    ConnectionCheckerService,
    MigrateCommand,
    RollbackCommand,
    StatusCommand,
  ],
  exports: [MigrationService, ConnectionCheckerService],
})
export class MigrationModule {}
