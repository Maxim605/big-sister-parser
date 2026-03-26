import { Module } from "@nestjs/common";
import { VkGroupModule } from "./vk-group/vk-group.module";
import { VkFriendsModule } from "./vk-friends/vk-friends.module";
import { VkUserModule } from "./vk-user/vk-user.module";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";
import { VkInteractionsModule } from "./vk-interactions/vk-interactions.module";

@Module({
  imports: [
    VkGroupModule,
    VkFriendsModule,
    VkUserModule,
    OrchestratorModule,
    VkInteractionsModule,
  ],
  exports: [
    VkGroupModule,
    VkFriendsModule,
    VkUserModule,
    OrchestratorModule,
    VkInteractionsModule,
  ],
})
export class VkModule {}
