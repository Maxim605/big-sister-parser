import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArangoModule } from "./arango/arango.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { VkFriendsModule } from "./domain/parser/vk/vk-friends/vk-friends.module";
import { VkUserModule } from "./domain/parser/vk/vk-user/vk-user.module";
import { ImportHttpModule } from './presentation/http/import/import.module';
import { CliModule } from './presentation/cli/cli.module';
import { ThriftModule } from "./thrift/thrift.module";
import settings from "./settings";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ArangoModule.forRoot(),
    ImportHttpModule,
    CliModule,
    VkFriendsModule,
    VkUserModule,
    ...(settings.enableThrift ? [ThriftModule] as any[] : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
