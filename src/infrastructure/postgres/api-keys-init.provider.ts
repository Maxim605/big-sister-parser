import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IApiKeyRepository } from '../../domain/repositories/iapi-key.repository';
import { TOKENS } from '../../common/tokens';

@Injectable()
export class ApiKeysInitProvider implements OnModuleInit {
  private readonly logger = new Logger(ApiKeysInitProvider.name);
  constructor(@Inject(TOKENS.IApiKeyRepository) private readonly repo: IApiKeyRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.repo.ensureTable();
      this.logger.log('Ensured api_keys table exists');
    } catch (e) {
      this.logger.error('Failed ensuring api_keys table', e as any);
    }
  }
}
