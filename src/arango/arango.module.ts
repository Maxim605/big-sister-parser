import { DynamicModule, Module, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Database, aql } from "arangojs";
import { ConfigModule } from "@nestjs/config";

@Module({})
export class ArangoModule {
  static forRoot(): DynamicModule {
    const arangoProvider: Provider = {
      provide: "ARANGODB_CLIENT",
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = new Database({
          url: config.get("ARANGO_URL"),
          databaseName: config.get("ARANGO_DB_NAME"),
          auth: {
            username: config.get("ARANGO_USER"),
            password: config.get("ARANGO_PASSWORD"),
          },
        });
        return db;
      },
    };

    return {
      module: ArangoModule,
      imports: [ConfigModule],
      providers: [arangoProvider],
      exports: [arangoProvider],
    };
  }
}
