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
  ],
  controllers: [VkFriendsController],
  exports: [
    VkApiService,
    LoadVkFriendsUseCase,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
    VkFriendsJobService,
  ],
})
export class VkFriendsModule {}
