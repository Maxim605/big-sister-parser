import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { TOKENS } from "../../common/tokens";
import settings from "../../settings";

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.RedisClient,
      useFactory: () => {
        const url = settings.redis.url;
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
        return client;
      },
    },
  ],
  exports: [TOKENS.RedisClient],
})
export class RedisModule {}
