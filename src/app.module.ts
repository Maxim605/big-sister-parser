import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArangoModule } from "./arango/arango.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { VkFriendsModule } from "./domain/parser/vk/vk-friends/vk-friends.module";
import { VkUserModule } from "./domain/parser/vk/vk-user/vk-user.module";
import { ThriftModule } from "./thrift/thrift.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ArangoModule.forRoot(),
    VkFriendsModule,
    VkUserModule,
    ThriftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
