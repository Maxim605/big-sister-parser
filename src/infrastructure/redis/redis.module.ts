import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { TOKENS } from "../../common/tokens";

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.RedisClient,
      useFactory: () => {
        const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
        });
        return client;
      },
    },
  ],
  exports: [TOKENS.RedisClient],
})
export class RedisModule {}
