import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "./services/vk-get-friends.service";
import { VkParserController } from "./vk-parser.controller";
import {
  LoadVkFriendsService,
  SaveVkFriendsService,
  TestSaveService,
} from "./services/cqrs/commands";
import { GetVkFriendsService } from "./services/cqrs/queries";
import { VkFriendsService } from "./services/vk-friends.service";
import { VkFriendMapperService } from "./services/vk-friend-mapper.service";
import { ThriftArangoService } from "../../../thrift/services/thrift-arango.service";

@Module({
  imports: [HttpModule],
  providers: [
    VkApiService,
    LoadVkFriendsService,
    SaveVkFriendsService,
    GetVkFriendsService,
    TestSaveService,
    VkFriendsService,
    VkFriendMapperService,
    ThriftArangoService,
  ],
  controllers: [VkParserController],
  exports: [VkApiService, VkFriendsService],
})
export class VkParserModule {}
