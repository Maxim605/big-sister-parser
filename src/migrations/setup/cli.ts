import "reflect-metadata";
import { CommandFactory } from "nest-commander";
import { Module } from "@nestjs/common";
import { MigrationService } from "./migration.service";
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
})
export class MigrationCliModule {}

async function bootstrap() {
  try {
    await CommandFactory.run(MigrationCliModule);
  } catch (error) {
    console.error('Error running CLI:', error);
    process.exit(1);
  }
}

bootstrap(); 