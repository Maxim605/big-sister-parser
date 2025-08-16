import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ArangoModule } from "src/arango/arango.module";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkFriendsController } from "./vk-friends.controller";
import { LoadVkFriendsService } from "src/domain/parser/vk/vk-friends/services/cqrs/commands/load-vk-friends.service";
import { SaveVkFriendsService } from "src/domain/parser/vk/vk-friends/services/cqrs/commands/save-vk-friends.service";
import { GetVkFriendsService } from "src/domain/parser/vk/vk-friends/services/cqrs/queries/get-vk-friends.service";
import { GetVkFriendsUseCase } from "src/application/use-cases/vk-friends/get-vk-friends.usecase";
import { FetchVkFriendsUseCase } from "src/application/use-cases/vk-friends/fetch-vk-friends.usecase";
import { VkFriendsService } from "src/domain/parser/vk/vk-friends/services/vk-friends.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { ThriftArangoStubService } from "src/thrift/services/thrift-arango-stub.service";
import settings from "src/settings";

@Module({
  imports: [HttpModule, ArangoModule.forRoot()],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    LoadVkFriendsService,
    SaveVkFriendsService,
    GetVkFriendsService,
    GetVkFriendsUseCase,
    FetchVkFriendsUseCase,
    VkFriendsService,
    ThriftArangoService,
  ],
  controllers: [VkFriendsController],
  exports: [VkFriendsService, VkApiService],
})
export class VkFriendsModule {}
