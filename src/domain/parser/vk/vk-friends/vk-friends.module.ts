import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "../services/vk-api.service";
import { VkFriendsController } from "./vk-friends.controller";
import { LoadVkFriendsService } from "./services/cqrs/commands/load-vk-friends.service";
import { SaveVkFriendsService } from "./services/cqrs/commands/save-vk-friends.service";
import { GetVkFriendsService } from "./services/cqrs/queries/get-vk-friends.service";
import { FetchVkFriendsService } from "./services/cqrs/queries/fetch-vk-friends.service";
import { VkFriendsService } from "./services/vk-friends.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

@Module({
  imports: [HttpModule],
  providers: [
    VkApiService,
    LoadVkFriendsService,
    SaveVkFriendsService,
    GetVkFriendsService,
    FetchVkFriendsService,
    VkFriendsService,
    ThriftArangoService,
  ],
  controllers: [VkFriendsController],
  exports: [VkFriendsService, VkApiService],
})
export class VkFriendsModule {}
