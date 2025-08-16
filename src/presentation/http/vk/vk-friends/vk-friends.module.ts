import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkFriendsController } from "./vk-friends.controller";
import { LoadVkFriendsService } from "src/domain/parser/vk/vk-friends/services/cqrs/commands/load-vk-friends.service";
import { SaveVkFriendsService } from "src/domain/parser/vk/vk-friends/services/cqrs/commands/save-vk-friends.service";
import { GetVkFriendsUseCase } from "src/application/use-cases/vk-friends/get-vk-friends.usecase";
import { FetchVkFriendsUseCase } from "src/application/use-cases/vk-friends/fetch-vk-friends.usecase";
import { VkFriendsService } from "src/domain/parser/vk/vk-friends/services/vk-friends.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    LoadVkFriendsService,
    SaveVkFriendsService,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
    VkFriendsService,
    ThriftArangoService,
  ],
  controllers: [VkFriendsController],
  exports: [VkFriendsService, VkApiService],
})
export class VkFriendsModule {}
