import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkGroupController } from "./vk-group.controller";
import { VkGroupApiClient } from "src/infrastructure/vk/vk-group-api.client";
import { TOKENS } from "src/common/tokens";
import { VkGroupInfoUseCase } from "src/application/use-cases/vk-group/vk-group-info.usecase";
import { VkGroupPostsUseCase } from "src/application/use-cases/vk-group/vk-group-posts.usecase";
import { VkGroupMembersUseCase } from "src/application/use-cases/vk-group/vk-group-members.usecase";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";

@Module({
  imports: [HttpModule, ArangoRepositoriesModule],
  providers: [
    VkGroupApiClient,
    {
      provide: TOKENS.IVkGroupApiClient,
      useExisting: VkGroupApiClient,
    },
    VkGroupInfoUseCase,
    VkGroupPostsUseCase,
    VkGroupMembersUseCase,
  ],
  controllers: [VkGroupController],
  exports: [
    VkGroupInfoUseCase,
    VkGroupPostsUseCase,
    VkGroupMembersUseCase,
    TOKENS.IVkGroupApiClient,
  ],
})
export class VkGroupModule implements OnModuleInit {
  private readonly logger = new Logger(VkGroupModule.name);

  onModuleInit() {
    this.logger.log("VkGroupModule initialized");
  }
}
