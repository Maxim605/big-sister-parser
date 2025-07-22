import { Injectable, OnModuleInit } from "@nestjs/common";
const thrift = require("thrift");
const path = require("path");
const ArangoService = require("../gen-nodejs/ArangoService");
const ttypes = require("../gen-nodejs/arango_types");

@Injectable()
export class ThriftArangoService implements OnModuleInit {
  private client: any;
  private connection: any;

  onModuleInit() {
    this.connection = thrift.createConnection("localhost", 9090, {
      transport: thrift.TBufferedTransport,
      protocol: thrift.TBinaryProtocol,
    });
    this.client = thrift.createClient(ArangoService, this.connection);
  }

  async save(collection: string, fields: Record<string, any>) {
    // Thrift требует map<string, string>, поэтому сериализуем значения
    const stringFields: Record<string, string> = {};
    for (const key in fields) {
      if (fields[key] !== undefined && fields[key] !== null) {
        stringFields[key] = String(fields[key]);
      }
    }
    const req = new ttypes.SaveRequest({ collection, fields: stringFields });
    return await this.client.save(req);
  }

  async get(collection: string, key: string) {
    const req = new ttypes.GetRequest({ collection, key });
    return await this.client.get(req);
  }
}
