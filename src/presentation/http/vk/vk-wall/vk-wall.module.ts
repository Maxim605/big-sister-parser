import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { KeyModule } from "src/infrastructure/key/key.module";
import { RedisModule } from "src/infrastructure/redis/redis.module";
import { VkWallController } from "./vk-wall.controller";
import { VkWallApiClient } from "src/infrastructure/vk/vk-wall-api.client";
import { TOKENS } from "src/common/tokens";
import { VkWallJobService } from "src/infrastructure/jobs/vk-wall.job.service";
import { RateLimiterService } from "src/infrastructure/rate-limiter/rate-limiter.service";
import settings from "src/settings";
import { Queue } from "bullmq";
import { VkWallQueueEventsService } from "src/infrastructure/queue/vk-wall-queue-events.service";
import { GetWallByOwnerQuery } from "src/application/queries/vk-wall/get-wall-by-owner.query";
import { RedisMetricsService } from "src/infrastructure/metrics/redis-metrics.service";
import { InMemoryEventBus } from "src/infrastructure/events/in-memory-event-bus.service";
import { LoadWallByOwnerCommand } from "src/application/commands/vk-wall/load-wall-by-owner.command";
import { LoadWallByIdsCommand } from "src/application/commands/vk-wall/load-wall-by-ids.command";

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
    { provide: TOKENS.IMetricsService, useClass: RedisMetricsService },
    { provide: TOKENS.IDomainEventBus, useClass: InMemoryEventBus },
    LoadWallByOwnerCommand,
    LoadWallByIdsCommand,
    VkWallJobService,
    {
      provide: Queue,
      useFactory: (redis) => new Queue("vk-wall-load", { connection: redis }),
      inject: [TOKENS.RedisClient],
    },
    VkWallQueueEventsService,
    GetWallByOwnerQuery,
  ],
  controllers: [VkWallController],
  exports: [
    TOKENS.IVkWallApiClient,
    TOKENS.IRateLimiter,
    TOKENS.IMetricsService,
    TOKENS.IDomainEventBus,
    LoadWallByOwnerCommand,
    LoadWallByIdsCommand,
    VkWallJobService,
    VkWallQueueEventsService,
    GetWallByOwnerQuery,
  ],
})
export class VkWallModule {}
