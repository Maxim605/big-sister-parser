import { Module } from "@nestjs/common";
import { GrpcModule } from "src/grpc/grpc.module";
import { HttpModule } from "@nestjs/axios";
import { VkApiService } from "./services/vk-api.service";
import { VkParserController } from "./vk-parser.controller";

@Module({
  imports: [GrpcModule, HttpModule],
  providers: [VkApiService],
  controllers: [VkParserController],
  exports: [VkApiService],
})
export class VkParserModule {}
