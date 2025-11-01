import { Module } from "@nestjs/common";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestrateFriendsUseCase } from "src/application/use-cases/orchestrator/orchestrate-friends.usecase";
import { VkFriendsModule } from "../vk/vk-friends/vk-friends.module";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";

@Module({
  imports: [VkFriendsModule, ArangoRepositoriesModule],
  providers: [OrchestrateFriendsUseCase],
  controllers: [OrchestratorController],
  exports: [OrchestrateFriendsUseCase],
})
export class OrchestratorModule {}
