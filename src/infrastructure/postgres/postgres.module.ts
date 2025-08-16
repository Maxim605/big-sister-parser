import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";
import settings from "../../settings";
import { TOKENS } from "../../common/tokens";

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.PgPool,
      useFactory: async () => {
        const pool = new Pool({
          host: settings.db.host,
          port: settings.db.port,
          user: settings.db.username,
          password: settings.db.password,
          database: settings.db.database,
        });
        return pool;
      },
    },
  ],
  exports: [TOKENS.PgPool],
})
export class PostgresModule {}
