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

@Module({
  imports: [HttpModule, ArangoRepositoriesModule, KeyModule],
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
  ],
  controllers: [VkUserController],
  exports: [VkApiService],
})
export class VkUserModule {}
