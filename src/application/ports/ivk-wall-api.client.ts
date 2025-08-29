import { ApiKeyLease } from "../services/key-manager.types";

export interface IVkWallApiClient {
  wallFetch(
    params: {
      owner_id?: number;
      domain?: string;
      offset?: number;
      count?: number;
      token: string;
      extended?: number;
      filter?: string;
    },
    lease?: ApiKeyLease,
  ): Promise<{
    items: any[];
    count?: number;
    profiles?: any[];
    groups?: any[];
  }>;

  wallGetById(
    params: { posts: string[]; extended?: number; token?: string },
    lease?: ApiKeyLease,
  ): Promise<{ items: any[] }>;
} 