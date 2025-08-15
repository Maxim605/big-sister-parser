import { ApiKeyLease, CallResult } from './key-manager.types';

export interface IKeyManager {
  leaseKey(network: string, options?: { priority?: number }): Promise<ApiKeyLease>;
  releaseKey(lease: ApiKeyLease, result?: CallResult): Promise<void>;
  markInvalid(keyId: string, reason: string): Promise<void>;
  reloadKeys(network?: string): Promise<void>;
}
