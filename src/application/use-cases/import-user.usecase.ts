import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../../common/tokens';
import { IKeyManager } from '../services/key-manager.port';
import { ISocialApiClient } from '../ports/social-api.client';
import { IUserRepository } from '../../domain/repositories/iuser.repository';
import { VkUser } from '../../domain/entities/vk-user';

@Injectable()
export class ImportUserUseCase {
  private readonly logger = new Logger(ImportUserUseCase.name);

  constructor(
    @Inject(TOKENS.IKeyManager) private readonly keyManager: IKeyManager,
    @Inject(TOKENS.ISocialApiClient) private readonly api: ISocialApiClient,
    @Inject(TOKENS.IUserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(userId: number): Promise<VkUser> {
    const lease = await this.keyManager.leaseKey(this.api.network);
    try {
      const { data, statusCode, headers } = await this.api.call<any>('users.get', { user_ids: userId, fields: 'domain' }, lease);
      const item = Array.isArray(data) ? data[0] : data?.[0];
      if (!item) throw new Error('VK user not found');
      const user = VkUser.fromApi(item);
      await this.users.save(user);
      await this.keyManager.releaseKey(lease, { statusCode, headers });
      return user;
    } catch (err: any) {
      const statusCode = err?.statusCode ?? 500;
      const headers = err?.headers;
      await this.keyManager.releaseKey(lease, { statusCode, headers, error: err });
      this.logger.warn(`ImportUser failed for ${userId}: ${err?.message || err}`);
      throw err;
    }
  }
}
