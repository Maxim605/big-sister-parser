import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

async function run() {
  const db = new Database({
    url: settings.grpc.url || "http://127.0.0.1:8529",
    databaseName: settings.arango.database || "mydb",
    auth: {
      username: settings.arango.username || "root",
      password: settings.arango.password || "test",
    },
  });

  const docCols = ["users", "groups"];
  for (const name of docCols) {
    const col = db.collection(name);
    const exists = await col.exists();
    if (!exists) {
      await db.createCollection(name);
      console.log(`✅ Document collection "${name}" created`);
    } else {
      console.log(`ℹ️  Document collection "${name}" already exists`);
    }
  }

  const edgeCols = ["friends", "subscriptions"];
  for (const name of edgeCols) {
    const col = db.collection(name);
    const exists = await col.exists();
    if (!exists) {
      await db.createEdgeCollection(name);
      console.log(`✅ Edge collection "${name}" created`);
    } else {
      console.log(`ℹ️  Edge collection "${name}" already exists`);
    }
  }
}

run()
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
