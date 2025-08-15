export type ApiKeyStatus = 'active' | 'invalid' | 'paused';

export interface ApiKeyRecord {
  id: string;
  network: string; // e.g., 'vk'
  tokenEncrypted: string;
  status: ApiKeyStatus;
  pausedUntil?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IApiKeyRepository {
  ensureTable(): Promise<void>;
  findActiveKeys(network: string): Promise<ApiKeyRecord[]>;
  updateStatus(id: string, status: ApiKeyStatus, pausedUntil?: number | null): Promise<void>;
  save(record: ApiKeyRecord): Promise<void>;
}
