import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { API_V1 } from '../../../constants';
import { ImportUserUseCase } from '../../../application/use-cases/import-user.usecase';
import { SyncFriendsUseCase } from '../../../application/use-cases/sync-friends.usecase';
import { VkUser } from '../../../domain/entities/vk-user';

@Controller(`${API_V1}/import`)
export class ImportController {
  constructor(
    private readonly importUser: ImportUserUseCase,
    private readonly syncFriendsUseCase: SyncFriendsUseCase,
  ) {}

  @Post('users/:id')
  async importUserById(@Param('id', ParseIntPipe) id: number): Promise<VkUser> {
    return this.importUser.execute(id);
  }

  @Post('users/:id/friends')
  async syncFriends(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ userId: number; total: number; fetched: number }> {
    return this.syncFriendsUseCase.execute(id);
  }
}
