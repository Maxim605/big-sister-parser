import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkFriendsController } from "./vk-friends.controller";
import { GetVkFriendsUseCase } from "src/application/use-cases/vk-friends/get-vk-friends.usecase";
import { FetchVkFriendsUseCase } from "src/application/use-cases/vk-friends/fetch-vk-friends.usecase";
import { LoadVkFriendsUseCase } from "src/application/use-cases/vk-friends/load-vk-friends.usecase";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    LoadVkFriendsUseCase,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
  ],
  controllers: [VkFriendsController],
  exports: [VkApiService, LoadVkFriendsUseCase, GetVkFriendsUseCase, FetchVkFriendsUseCase],
})
export class VkFriendsModule {}
