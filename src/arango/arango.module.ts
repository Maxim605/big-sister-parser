import { DynamicModule, Module, Provider } from "@nestjs/common";
import { Database } from "arangojs";
import settings from "../settings";

@Module({})
export class ArangoModule {
  static forRoot(): DynamicModule {
    const arangoProvider: Provider = {
      provide: "ARANGODB_CLIENT",
      useFactory: async () => {
        const db = new Database({
          url: settings.arango.url,
          databaseName: settings.arango.database,
          auth: {
            username: settings.arango.username,
            password: settings.arango.password,
          },
        });
        try {
          await db.listCollections();
        } catch (e) {
          throw new Error(`[ArangoModule] Ошибка подключения к ArangoDB: ${e}`);
        }
        return db;
      },
    };

    return {
      module: ArangoModule,
      imports: [],
      providers: [arangoProvider],
      exports: [arangoProvider],
    };
  }
}
