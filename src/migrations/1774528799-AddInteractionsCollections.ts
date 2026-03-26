import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

export class AddInteractionsCollections1774528799 {
  private db: Database;
  public readonly id = "1774528799";
  public readonly name = "AddInteractionsCollections";
  public readonly timestamp = 1774528799;

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
    console.log("🔄 Running AddInteractionsCollections up...");
    for (const name of ["likes", "comments"]) {
      const col = this.db.collection(name);
      if (!(await col.exists())) {
        await this.db.createEdgeCollection(name);
        console.log(`✅ Edge collection '${name}' created`);
      } else {
        console.log(`ℹ️ Edge collection '${name}' already exists`);
      }
    }
  }

  async down(): Promise<void> {
    console.log("🔄 Running AddInteractionsCollections down...");
    for (const name of ["likes", "comments"]) {
      const col = this.db.collection(name);
      if (await col.exists()) {
        await col.drop();
        console.log(`✅ Edge collection '${name}' dropped`);
      } else {
        console.log(`ℹ️ Edge collection '${name}' does not exist`);
      }
    }
  }
}
