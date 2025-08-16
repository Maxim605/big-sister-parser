import { Module } from "@nestjs/common";
import { AddApiKeyCommand } from "./commands/add-api-key.command";
import { PostgresRepositoriesModule } from "../../infrastructure/postgres/postgres-repositories.module";
import { SecurityModule } from "../../infrastructure/security/security.module";

@Module({
  imports: [PostgresRepositoriesModule, SecurityModule],
  providers: [AddApiKeyCommand],
})
export class CliModule {}
