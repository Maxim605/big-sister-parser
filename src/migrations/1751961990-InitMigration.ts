import "reflect-metadata";
import { Database } from "arangojs";
import { ThriftArangoService } from "../thrift/services/thrift-arango.service";
import settings from "../settings";

async function run() {
  const db = new Database({
    url: settings.arango.url,
    databaseName: settings.arango.database,
    auth: {
      username: settings.arango.username,
      password: settings.arango.password,
    },
  });

  for (const name of ["users", "groups"]) {
    const col = db.collection(name);
    if (!(await col.exists())) {
      await db.createCollection(name);
      console.log(`✅ Document collection '${name}' created`);
    } else {
      console.log(`ℹ️ Document collection '${name}' already exists`);
    }
  }

  for (const name of ["subscriptions", "friendships"]) {
    const col = db.collection(name);
    if (!(await col.exists())) {
      await db.createEdgeCollection(name);
      console.log(`✅ Edge collection '${name}' created`);
    } else {
      console.log(`ℹ️ Edge collection '${name}' already exists`);
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
