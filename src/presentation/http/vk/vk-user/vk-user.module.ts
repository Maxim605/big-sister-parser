import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkUserController } from "./vk-user.controller";
import { LoadVkUserService } from "src/domain/parser/vk/vk-user/services/cqrs/commands/load-vk-user.service";
import { LoadVkUserSubscriptionsService } from "src/domain/parser/vk/vk-user/services/cqrs/commands/load-vk-user-subscriptions.service";
import { FetchVkUserUseCase } from "src/application/use-cases/vk-user/fetch-vk-user.usecase";
import { FetchVkUserSubscriptionsUseCase } from "src/application/use-cases/vk-user/fetch-vk-user-subscriptions.usecase";
import { GetVkSubscriptionsUseCase } from "src/application/use-cases/vk-user/get-vk-subscriptions.usecase";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { KeyModule } from "src/infrastructure/key/key.module";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule, KeyModule],
  providers: [
    VkApiService,
    {
      provide: "IVkApiClient",
      useClass: VkApiService,
    },
    LoadVkUserService,
    LoadVkUserSubscriptionsService,
    FetchVkUserUseCase,
    FetchVkUserSubscriptionsUseCase,
    GetVkSubscriptionsUseCase,
    ThriftArangoService,
  ],
  controllers: [VkUserController],
  exports: [VkApiService],
})
export class VkUserModule {}
