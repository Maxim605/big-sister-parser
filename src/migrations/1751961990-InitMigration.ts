import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

export class InitMigration1751961990 {
  private db: Database;
  public readonly id = '1751961990';
  public readonly name = 'InitMigration';
  public readonly timestamp = 1751961990;

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
    console.log("🔄 Running InitMigration up...");
    
    for (const name of ["users", "groups"]) {
      const col = this.db.collection(name);
      if (!(await col.exists())) {
        await this.db.createCollection(name);
        console.log(`✅ Document collection '${name}' created`);
      } else {
        console.log(`ℹ️ Document collection '${name}' already exists`);
      }
    }

    for (const name of ["subscriptions", "friendships"]) {
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
    console.log("🔄 Running InitMigration down...");
    
    for (const name of ["users", "groups", "subscriptions", "friendships"]) {
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

export const initMigration = new InitMigration1751961990();

async function run() {
  const migration = new InitMigration1751961990();
  await migration.up();
  console.log("Migration completed");
  process.exit(0);
}

if (require.main === module) {
  run()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
