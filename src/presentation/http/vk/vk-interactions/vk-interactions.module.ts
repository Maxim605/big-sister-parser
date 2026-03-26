import { Module, Logger, OnModuleInit } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { VkInteractionsController } from "./vk-interactions.controller";
import { VkInteractionsApiClient } from "src/infrastructure/vk/vk-interactions-api.client";
import { TOKENS } from "src/common/tokens";
import { VkLikesUseCase } from "src/application/use-cases/vk-interactions/vk-likes.usecase";
import { VkCommentsUseCase } from "src/application/use-cases/vk-interactions/vk-comments.usecase";

@Module({
  imports: [HttpModule],
  providers: [
    VkInteractionsApiClient,
    { provide: TOKENS.IVkInteractionsApiClient, useExisting: VkInteractionsApiClient },
    VkLikesUseCase,
    VkCommentsUseCase,
  ],
  controllers: [VkInteractionsController],
  exports: [VkLikesUseCase, VkCommentsUseCase, TOKENS.IVkInteractionsApiClient],
})
export class VkInteractionsModule implements OnModuleInit {
  private readonly logger = new Logger(VkInteractionsModule.name);
  onModuleInit() { this.logger.log("VkInteractionsModule initialized"); }
}
