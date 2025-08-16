import { DynamicModule, Module, Provider } from "@nestjs/common";
import { Database } from "arangojs";
import settings from "../settings";

@Module({})
export class ArangoModule {
  static forRoot(): DynamicModule {
    const arangoProvider: Provider = {
      provide: "ARANGODB_CLIENT",
      useFactory: async () => {
        const sys = new Database({
          url: settings.arango.url,
          auth: {
            username: settings.arango.username,
            password: settings.arango.password,
          },
        });
        const dbName = settings.arango.database;
        try {
          const dbs = await sys.listDatabases();
          if (!dbs.includes(dbName)) {
            await sys.createDatabase(dbName);
            console.log(`Created ArangoDB database '${dbName}'`);
          }
          const db = sys.database(dbName);
          await db.listCollections();
          return db;
        } catch (e) {
          throw new Error(`[ArangoModule] Ошибка подключения к ArangoDB: ${e}`);
        }
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
