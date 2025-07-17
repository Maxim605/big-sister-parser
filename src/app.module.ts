import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArangoModule } from "./arango/arango.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { VkParserModule } from "./domain/parser/vk-parser/vk-parser.module";
import { GrpcModule } from "./grpc/grpc.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ArangoModule.forRoot(),
    VkParserModule,
    GrpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
