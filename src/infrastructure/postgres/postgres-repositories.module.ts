import { Module } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import { PostgresModule } from "./postgres.module";
import { PostgresApiKeyRepository } from "./repositories/postgres-api-key.repository";
import { SecurityModule } from "../security/security.module";
import { ApiKeysInitProvider } from "./api-keys-init.provider";

@Module({
  imports: [PostgresModule, SecurityModule],
  providers: [
    { provide: TOKENS.IApiKeyRepository, useClass: PostgresApiKeyRepository },
    ApiKeysInitProvider,
  ],
  exports: [TOKENS.IApiKeyRepository],
})
export class PostgresRepositoriesModule {}
