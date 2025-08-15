import { Inject, Injectable, Logger } from '@nestjs/common';
import { IKeyManager } from '../../application/services/key-manager.port';
import { ApiKeyLease, CallResult } from '../../application/services/key-manager.types';
import { IApiKeyRepository } from '../../domain/repositories/iapi-key.repository';
import { TOKENS } from '../../common/tokens';
import { RedisLeasingService } from './redis-leasing.service';
import { RoundRobinStrategy } from './strategies/round-robin.strategy';
import { KeyState } from './types';
import { RateLimiter } from './rate-limiter';
import { CryptoService } from '../security/crypto.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KeyManager implements IKeyManager {
  private readonly logger = new Logger(KeyManager.name);
  private readonly keysByNetwork: Map<string, KeyState[]> = new Map();
  private readonly keyIndex: Map<string, KeyState> = new Map();

  constructor(
    @Inject(TOKENS.IApiKeyRepository) private readonly keyRepo: IApiKeyRepository,
    private readonly leasing: RedisLeasingService,
    private readonly strategy: RoundRobinStrategy,
    private readonly crypto: CryptoService,
  ) {}

  async leaseKey(network: string, _options?: { priority?: number }): Promise<ApiKeyLease> {
    await this.ensureLoaded(network);
    const list = this.keysByNetwork.get(network) || [];
    const now = Date.now();
    const tries = list.length;

    for (let i = 0; i < tries; i++) {
      const key = this.strategy.pick(list, { now });
      if (!key) break;
      if (key.status !== 'active') continue;
      if (key.pausedUntil && key.pausedUntil > now) continue;
      if (!key.limiter.take(now)) continue;

      const leaseId = uuidv4();
      const ok = await this.leasing.tryLease(key.id, leaseId, 5);
      if (!ok) continue;

      key.lastUsedAt = now;
      const tokenDecrypted = this.crypto.decryptFromCompact(key.tokenEncrypted);
      return {
        keyId: key.id,
        tokenDecrypted,
        leaseId,
        expiresAt: now + 5000,
      };
    }

    throw new Error('No available API key to lease');
  }

  async releaseKey(lease: ApiKeyLease, result?: CallResult): Promise<void> {
    await this.leasing.release(lease.keyId, lease.leaseId);
    const key = this.keyIndex.get(lease.keyId);
    if (!key) return;

    if (!result) return;

    // Handle errors and backoff
    const status = result.statusCode;
    if (status === 429) {
      const retryAfter = Number(result.headers?.['retry-after'] ?? 1);
      const pauseMs = Math.max(1, Math.floor(retryAfter * 1000));
      key.pausedUntil = Date.now() + pauseMs;
      key.status = 'paused';
      await this.keyRepo.updateStatus(key.id, 'paused', key.pausedUntil);
      return;
    }
    if (status === 401) {
      key.status = 'invalid';
      await this.keyRepo.updateStatus(key.id, 'invalid', null);
      return;
    }
    if (status >= 500) {
      key.errorCount += 1;
      // simple circuit: if >3 in 60s -> pause 30s
      if (key.errorCount >= 3) {
        key.pausedUntil = Date.now() + 30_000;
        key.status = 'paused';
        key.errorCount = 0;
        await this.keyRepo.updateStatus(key.id, 'paused', key.pausedUntil);
      }
      return;
    }

    // Success path: reset paused and errors if needed
    if (key.status !== 'active') {
      key.status = 'active';
      key.pausedUntil = null;
      await this.keyRepo.updateStatus(key.id, 'active', null);
    }
    key.errorCount = 0;
  }

  async markInvalid(keyId: string, _reason: string): Promise<void> {
    const key = this.keyIndex.get(keyId);
    if (key) key.status = 'invalid';
    await this.keyRepo.updateStatus(keyId, 'invalid', null);
  }

  async reloadKeys(network?: string): Promise<void> {
    if (network) {
      await this.loadNetwork(network);
    } else {
      // If unspecified, load for networks present in DB (we need list). For now: load 'vk' only.
      await this.loadNetwork('vk');
    }
  }

  private async ensureLoaded(network: string) {
    if (!this.keysByNetwork.has(network)) {
      await this.loadNetwork(network);
    }
  }

  private async loadNetwork(network: string) {
    const records = await this.keyRepo.findActiveKeys(network);
    const limiterCfg = {
      tokensPerInterval: Number(process.env.KEY_RPS || 3),
      intervalMs: 1000,
    };
    const list: KeyState[] = records.map((r) => ({
      id: r.id,
      network: r.network,
      tokenEncrypted: r.tokenEncrypted,
      status: r.status,
      pausedUntil: r.pausedUntil ?? null,
      limiter: new RateLimiter(limiterCfg),
      errorCount: 0,
    }));
    this.keysByNetwork.set(network, list);
    for (const k of list) this.keyIndex.set(k.id, k);
    this.logger.log(`Loaded ${list.length} keys for network=${network}`);
  }
}
