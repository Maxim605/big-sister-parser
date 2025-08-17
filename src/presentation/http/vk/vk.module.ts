import { Module } from "@nestjs/common";
import { VkFriendsModule } from "./vk-friends/vk-friends.module";
import { VkUserModule } from "./vk-user/vk-user.module";

@Module({
  imports: [VkFriendsModule, VkUserModule],
  exports: [VkFriendsModule, VkUserModule],
})
export class VkModule {}
