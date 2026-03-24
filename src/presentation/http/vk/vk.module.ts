import { Module } from "@nestjs/common";
import { VkFriendsModule } from "./vk-friends/vk-friends.module";
import { VkUserModule } from "./vk-user/vk-user.module";
import { VkWallModule } from "./vk-wall/vk-wall.module";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";
import { VkGroupModule } from "./vk-group/vk-group.module";

@Module({
  imports: [VkFriendsModule, VkUserModule, VkWallModule, OrchestratorModule, VkGroupModule],
  exports: [VkFriendsModule, VkUserModule, VkWallModule, OrchestratorModule, VkGroupModule],
})
export class VkModule {}
