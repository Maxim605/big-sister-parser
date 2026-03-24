import { Module } from "@nestjs/common";
import { VkGroupModule } from "./vk-group/vk-group.module";
import { VkFriendsModule } from "./vk-friends/vk-friends.module";
import { VkUserModule } from "./vk-user/vk-user.module";
import { VkWallModule } from "./vk-wall/vk-wall.module";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";

@Module({
  imports: [
    VkGroupModule,
    VkFriendsModule,
    VkUserModule,
    VkWallModule,
    OrchestratorModule,
  ],
  exports: [
    VkGroupModule,
    VkFriendsModule,
    VkUserModule,
    VkWallModule,
    OrchestratorModule,
  ],
})
export class VkModule {}
