import { CommandRunner } from "nest-commander";
import { Injectable, Logger } from "@nestjs/common";
import { ConnectionCheckerService } from "./connection-checker.service";

@Injectable()
export abstract class BaseCommand extends CommandRunner {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly connectionChecker: ConnectionCheckerService) {
    super();
  }

  protected async checkConnection(): Promise<boolean> {
    const result = await this.connectionChecker.checkConnection();
    if (!result.success) {
      this.logger.error(`❌ ${result.message}`);
      return false;
    }
    return true;
  }

  protected async ensureDatabaseExists(): Promise<boolean> {
    const createResult =
      await this.connectionChecker.createDatabaseIfNotExists();
    if (!createResult.success) {
      this.logger.error(`❌ ${createResult.message}`);
      return false;
    }
    return true;
  }

  protected async performConnectionCheck(): Promise<boolean> {
    if (!(await this.checkConnection())) return false;
    if (!(await this.ensureDatabaseExists())) return false;
    return true;
  }
}
