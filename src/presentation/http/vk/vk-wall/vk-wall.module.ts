import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { KeyModule } from "src/infrastructure/key/key.module";
import { RedisModule } from "src/infrastructure/redis/redis.module";
import { VkWallController } from "./vk-wall.controller";
import { LoadWallGetUseCase } from "src/application/use-cases/vk-wall/load-wall-get.usecase";
import { LoadWallGetByIdUseCase } from "src/application/use-cases/vk-wall/load-wall-get-by-id.usecase";
import { VkWallApiClient } from "src/infrastructure/vk/vk-wall-api.client";
import { TOKENS } from "src/common/tokens";
import { VkWallJobService } from "src/infrastructure/jobs/vk-wall.job.service";
import { RateLimiterService } from "src/infrastructure/rate-limiter/rate-limiter.service";
import settings from "src/settings";
import { Queue } from "bullmq";
import { VkWallQueueEventsService } from "src/infrastructure/queue/vk-wall-queue-events.service";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule, KeyModule, RedisModule],
  providers: [
    VkWallApiClient,
    { provide: TOKENS.IVkWallApiClient, useExisting: VkWallApiClient },
    {
      provide: TOKENS.IRateLimiter,
      useFactory: (redis) => {
        const opts = settings.vkWall as any;
        const rl = new RateLimiterService(redis, {
          capacity: opts?.rateLimiter?.capacity ?? 20,
          refillRate: opts?.rateLimiter?.refillRate ?? 5,
        });
        return rl;
      },
      inject: [TOKENS.RedisClient],
    },
    LoadWallGetUseCase,
    LoadWallGetByIdUseCase,
    VkWallJobService,
    {
      provide: Queue,
      useFactory: (redis) => new Queue("vk-wall-load", { connection: redis }),
      inject: [TOKENS.RedisClient],
    },
    VkWallQueueEventsService,
  ],
  controllers: [VkWallController],
  exports: [
    TOKENS.IVkWallApiClient,
    TOKENS.IRateLimiter,
    LoadWallGetUseCase,
    LoadWallGetByIdUseCase,
    VkWallJobService,
    VkWallQueueEventsService,
  ],
})
export class VkWallModule {}
