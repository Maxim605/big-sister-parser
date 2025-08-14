import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "../services/vk-api.service";
import { VkUserController } from "./vk-user.controller";
import { LoadVkUserService } from "./services/cqrs/commands/load-vk-user.service";
import { LoadVkUserSubscriptionsService } from "./services/cqrs/commands/load-vk-user-subscriptions.service";
import { GetVkUserService } from "./services/cqrs/queries/get-vk-user.service";
import { FetchVkUserService } from "./services/cqrs/queries/fetch-vk-user.service";
import { FetchVkUserSubscriptionsService } from "./services/cqrs/queries/fetch-vk-user-subscriptions.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

@Module({
  imports: [HttpModule],
  providers: [
    VkApiService,
    LoadVkUserService,
    LoadVkUserSubscriptionsService,
    GetVkUserService,
    FetchVkUserService,
    FetchVkUserSubscriptionsService,
    ThriftArangoService,
  ],
  controllers: [VkUserController],
  exports: [VkApiService],
})
export class VkUserModule {}
