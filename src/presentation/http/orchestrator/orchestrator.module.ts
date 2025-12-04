import { Module } from "@nestjs/common";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestrateFriendsUseCase } from "src/application/use-cases/orchestrator/orchestrate-friends.usecase";
import { VkFriendsModule } from "../vk/vk-friends/vk-friends.module";
import { ArangoRepositoriesModule } from "src/infrastructure/arango/arango-repositories.module";
import { LoadFriendsGraphUseCase } from "src/application/use-cases/orchestrator/load-friends-graph.usecase";
import { RedisGraphService } from "src/infrastructure/redis/redis-graph.service";
import { RedisModule } from "src/infrastructure/redis/redis.module";
import { LoadFriendsGraphParamsMapper } from "src/application/use-cases/orchestrator/mappers/load-friends-graph-params.mapper";

@Module({
  imports: [VkFriendsModule, ArangoRepositoriesModule, RedisModule],
  providers: [
    OrchestrateFriendsUseCase,
    LoadFriendsGraphUseCase,
    RedisGraphService,
    LoadFriendsGraphParamsMapper,
  ],
  controllers: [OrchestratorController],
  exports: [OrchestrateFriendsUseCase, LoadFriendsGraphUseCase],
})
export class OrchestratorModule {}
