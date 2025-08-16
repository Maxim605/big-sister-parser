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
    // Не создаем соединение при инициализации, а только при необходимости
  }

  private async ensureConnection() {
    if (!this.connection || !this.client) {
      try {
        this.connection = thrift.createConnection("localhost", 9090, {
          transport: thrift.TBufferedTransport,
          protocol: thrift.TBinaryProtocol,
        });
        this.client = thrift.createClient(ArangoService, this.connection);
      } catch (error) {
        console.error("Failed to connect to Thrift server:", error);
        throw error;
      }
    }
  }

  async save(collection: string, fields: Record<string, any>) {
    await this.ensureConnection();
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
    await this.ensureConnection();
    const req = new ttypes.GetRequest({ collection, key });
    return await this.client.get(req);
  }
}
