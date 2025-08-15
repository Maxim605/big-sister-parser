import { Module } from '@nestjs/common';
import { TOKENS } from '../../common/tokens';
import { RedisModule } from '../redis/redis.module';
import { SecurityModule } from '../security/security.module';
import { PostgresRepositoriesModule } from '../postgres/postgres-repositories.module';
import { KeyManager } from './key-manager';
import { RedisLeasingService } from './redis-leasing.service';
import { RoundRobinStrategy } from './strategies/round-robin.strategy';

@Module({
  imports: [RedisModule, SecurityModule, PostgresRepositoriesModule],
  providers: [
    RoundRobinStrategy,
    RedisLeasingService,
    KeyManager,
    { provide: TOKENS.IKeyManager, useExisting: KeyManager },
  ],
  exports: [TOKENS.IKeyManager],
})
export class KeyModule {}
