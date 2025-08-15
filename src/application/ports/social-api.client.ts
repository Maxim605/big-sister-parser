import { ApiKeyLease } from '../services/key-manager.types';

export interface ISocialApiClient {
  readonly network: string;
  call<T = any>(
    method: string,
    params: Record<string, any>,
    lease: ApiKeyLease,
  ): Promise<{ data: T; statusCode: number; headers?: Record<string, string | number> }>;
  refreshKey?(keyId: string): Promise<void>;
}

export const NETWORKS = {
  VK: 'vk',
} as const;
