import { Command, CommandRunner, Option } from 'nest-commander';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../../../common/tokens';
import { IApiKeyRepository } from '../../../domain/repositories/iapi-key.repository';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

interface AddKeyOptions {
  id: string;
  network: string;
  token: string;
}

@Injectable()
@Command({ name: 'keys:add', description: 'Add an API key to Postgres (encrypted)' })
export class AddApiKeyCommand extends CommandRunner {
  private readonly logger = new Logger(AddApiKeyCommand.name);
  constructor(
    @Inject(TOKENS.IApiKeyRepository) private readonly repo: IApiKeyRepository,
    private readonly crypto: CryptoService,
  ) {
    super();
  }

  async run(_: string[], options?: AddKeyOptions): Promise<void> {
    if (!options?.id || !options?.network || !options?.token) {
      this.logger.error('Usage: keys:add --id <id> --network <vk> --token <token>');
      return;
    }
    const tokenEncrypted = this.crypto.encryptToCompact(options.token);
    await this.repo.save({
      id: options.id,
      network: options.network,
      tokenEncrypted,
      status: 'active',
      pausedUntil: null,
    });
    this.logger.log(`Key ${options.id} for ${options.network} saved`);
  }

  @Option({ flags: '--id <id>', description: 'Key ID' })
  parseId(val: string): string {
    return val;
  }

  @Option({ flags: '--network <network>', description: 'Network identifier, e.g. vk' })
  parseNetwork(val: string): string {
    return val;
  }

  @Option({ flags: '--token <token>', description: 'Plain access token' })
  parseToken(val: string): string {
    return val;
  }
}
