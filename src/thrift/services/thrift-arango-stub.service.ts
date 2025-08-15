import { Injectable } from "@nestjs/common";

@Injectable()
export class ThriftArangoStubService {
  async save(collection: string, fields: Record<string, any>) {
    console.log(`[STUB] Would save to ${collection}:`, fields);
    return { success: true, key: fields._key || 'stub-key' };
  }

  async get(collection: string, key: string) {
    console.log(`[STUB] Would get from ${collection} with key: ${key}`);
    return { fields: { _key: key, stub: true } };
  }
} 