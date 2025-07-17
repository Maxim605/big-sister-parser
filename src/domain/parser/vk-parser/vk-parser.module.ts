import { Module } from "@nestjs/common";
import { GrpcModule } from "src/grpc/grpc.module";
import { VkApiService } from "./services/vk-api.service";
import { VkParserController } from "./vk-parser.controller";

@Module({
  imports: [GrpcModule],
  providers: [
    {
      provide: "VK_ACCESS_TOKEN",
      useValue: process.env.VK_ACCESS_TOKEN,
    },
    {
      provide: "VK_API_VERSION",
      useValue: "5.131",
    },
    VkApiService,
  ],
  controllers: [VkParserController],
  exports: [VkApiService],
})
export class VkParserModule {}
