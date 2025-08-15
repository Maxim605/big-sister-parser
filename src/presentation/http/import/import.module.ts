import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportUserUseCase } from '../../../application/use-cases/import-user.usecase';
import { SyncFriendsUseCase } from '../../../application/use-cases/sync-friends.usecase';
import { ArangoRepositoriesModule } from '../../../infrastructure/arango/arango-repositories.module';
import { KeyModule } from '../../../infrastructure/key/key.module';
import { VkApiModule } from '../../../infrastructure/vk/vk.module';

@Module({
  imports: [ArangoRepositoriesModule, KeyModule, VkApiModule],
  controllers: [ImportController],
  providers: [ImportUserUseCase, SyncFriendsUseCase],
})
export class ImportHttpModule {}
