import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

export class AddWallCollections1755735724 {
  private db: Database;
  public readonly id = "1755735724";
  public readonly name = "AddWallCollections";
  public readonly timestamp = 1755735724;

  constructor() {
    this.db = new Database({
      url: settings.arango.url,
      databaseName: settings.arango.database,
      auth: {
        username: settings.arango.username,
        password: settings.arango.password,
      },
    });
  }

  async up(): Promise<void> {
    console.log("🔄 Running AddWallCollections up...");

    for (const name of ["posts"]) {
      const col = this.db.collection(name);
      if (!(await col.exists())) {
        await this.db.createCollection(name);
        console.log(`✅ Document collection '${name}' created`);
      } else {
        console.log(`ℹ️ Document collection '${name}' already exists`);
      }
    }
  }

  async down(): Promise<void> {
    console.log("🔄 Running CreateCollections down...");

    for (const name of ["posts"]) {
      const col = this.db.collection(name);
      if (await col.exists()) {
        await col.drop();
        console.log(`✅ Collection '${name}' dropped`);
      } else {
        console.log(`ℹ️ Collection '${name}' does not exist`);
      }
    }
  }
}
