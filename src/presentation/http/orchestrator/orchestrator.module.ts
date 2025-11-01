import { Module } from "@nestjs/common";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestrateFriendsUseCase } from "src/application/use-cases/orchestrator/orchestrate-friends.usecase";
import { VkFriendsModule } from "../vk/vk-friends/vk-friends.module";

@Module({
  imports: [VkFriendsModule],
  providers: [OrchestrateFriendsUseCase],
  controllers: [OrchestratorController],
  exports: [OrchestrateFriendsUseCase],
})
export class OrchestratorModule {}
