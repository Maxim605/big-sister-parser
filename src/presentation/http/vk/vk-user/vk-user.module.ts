import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkUserController } from "./vk-user.controller";
import { FetchVkUserUseCase } from "src/application/use-cases/vk-user/fetch-vk-user.usecase";
import { FetchVkUserSubscriptionsUseCase } from "src/application/use-cases/vk-user/fetch-vk-user-subscriptions.usecase";
import { GetVkSubscriptionsUseCase } from "src/application/use-cases/vk-user/get-vk-subscriptions.usecase";
import { LoadVkUserSubscriptionsUseCase } from "src/application/use-cases/vk-user/load-vk-user-subscriptions.usecase";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { KeyModule } from "src/infrastructure/key/key.module";
import { RedisModule } from "src/infrastructure/redis/redis.module";
import { Queue } from "bullmq";
import { TOKENS } from "src/common/tokens";
import { VkUserSubscriptionsJobService } from "src/infrastructure/jobs/vk-user-subscriptions.job.service";
import { VkUserSubscriptionsQueueEventsService } from "src/infrastructure/queue/vk-user-subscriptions-queue-events.service";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule, KeyModule, RedisModule],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    FetchVkUserUseCase,
    FetchVkUserSubscriptionsUseCase,
    GetVkSubscriptionsUseCase,
    LoadVkUserSubscriptionsUseCase,
    VkUserSubscriptionsJobService,
    {
      provide: Queue,
      useFactory: (redis) => {
        return new Queue("vk-user-subscriptions-load", { connection: redis });
      },
      inject: [TOKENS.RedisClient],
    },
    VkUserSubscriptionsQueueEventsService,
  ],
  controllers: [VkUserController],
  exports: [
    VkApiService,
    VkUserSubscriptionsJobService,
    VkUserSubscriptionsQueueEventsService,
  ],
})
export class VkUserModule {}
