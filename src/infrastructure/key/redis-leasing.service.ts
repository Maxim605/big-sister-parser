import { Inject, Injectable } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import Redis from "ioredis";

@Injectable()
export class RedisLeasingService {
  constructor(@Inject(TOKENS.RedisClient) private readonly redis: Redis) {}

  async tryLease(
    keyId: string,
    leaseId: string,
    ttlSec: number,
  ): Promise<boolean> {
    const result = await this.redis.set(
      `lease:${keyId}`,
      leaseId,
      "EX",
      ttlSec,
      "NX",
    );
    return result === "OK";
  }

  async release(keyId: string, leaseId: string): Promise<void> {
    const lua = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end`;
    await this.redis.eval(lua, 1, `lease:${keyId}`, leaseId);
  }
}
