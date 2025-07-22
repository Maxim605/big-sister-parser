import { Module, OnModuleInit, Inject, Global } from "@nestjs/common";
import { Database } from "arangojs";
import { ArangoModule } from "../arango/arango.module";
import { ThriftArangoService } from "./services";
import { ThriftController } from "./thrift.controller";

const thrift = require("thrift");
const path = require("path");
const arangoService = require("./gen-nodejs/ArangoService"); // TODO: fix path

@Global()
@Module({
  imports: [ArangoModule.forRoot()],
  providers: [
    ThriftArangoService,
    {
      provide: "THRIFT_SERVER",
      useFactory: async (db: Database) => {
        const handler = {
          async save(req) {
            try {
              const col = db.collection(req.collection);
              const doc = req.fields;
              const res = await col.save(doc);
              return { success: true, key: res._key };
            } catch (e) {
              return { success: false, error: e.message };
            }
          },
          async get(req) {
            try {
              const col = db.collection(req.collection);
              const doc = await col.document(req.key);
              return { fields: doc };
            } catch (e) {
              return { error: e.message };
            }
          },
        };
        const server = thrift.createServer(arangoService, handler);
        server.listen(9090);
        return server;
      },
      inject: ["ARANGODB_CLIENT"],
    },
  ],
  exports: [ThriftArangoService],
  controllers: [ThriftController],
})
export class ThriftModule implements OnModuleInit {
  onModuleInit() {
    console.log("Thrift server started on port 9090");
  }
}
