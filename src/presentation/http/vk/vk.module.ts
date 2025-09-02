import { Module } from "@nestjs/common";
import { VkFriendsModule } from "./vk-friends/vk-friends.module";
import { VkUserModule } from "./vk-user/vk-user.module";
import { VkWallModule } from "./vk-wall/vk-wall.module";

@Module({
  imports: [VkFriendsModule, VkUserModule, VkWallModule],
  exports: [VkFriendsModule, VkUserModule, VkWallModule],
})
export class VkModule {}
