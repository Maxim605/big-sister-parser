import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkGroupController } from "./vk-group.controller";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { KeyModule } from "src/infrastructure/key/key.module";

@Module({
  imports: [HttpModule, KeyModule],
  providers: [VkApiService],
  controllers: [VkGroupController],
})
export class VkGroupModule {}
