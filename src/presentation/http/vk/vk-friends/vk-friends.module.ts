import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkFriendsController } from "./vk-friends.controller";
import { GetVkFriendsUseCase } from "src/application/use-cases/vk-friends/get-vk-friends.usecase";
import { FetchVkFriendsUseCase } from "src/application/use-cases/vk-friends/fetch-vk-friends.usecase";
import { LoadVkFriendsUseCase } from "src/application/use-cases/vk-friends/load-vk-friends.usecase";
import { KeyModule } from "src/infrastructure/key/key.module";
import { RedisModule } from "src/infrastructure/redis/redis.module";
import { VkFriendsJobService } from "src/infrastructure/jobs/vk-friends.job.service";
import { VkFriendsQueueEventsService } from "src/infrastructure/queue/vk-friends-queue-events.service";
import { Queue } from "bullmq";
import settings from "src/settings";
import { TOKENS } from "src/common/tokens";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule, KeyModule, RedisModule],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    LoadVkFriendsUseCase,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
    VkFriendsJobService,
    {
      provide: Queue,
      useFactory: (redis) => {
        return new Queue("vk-friends-load", { connection: redis });
      },
      inject: [TOKENS.RedisClient],
    },
    VkFriendsQueueEventsService,
  ],
  controllers: [VkFriendsController],
  exports: [
    VkApiService,
    LoadVkFriendsUseCase,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
    VkFriendsJobService,
    VkFriendsQueueEventsService,
  ],
})
export class VkFriendsModule {}
