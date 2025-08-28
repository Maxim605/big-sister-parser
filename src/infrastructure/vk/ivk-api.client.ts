export interface IVkWallApiClient {
  wallFetch(params: {
    owner_id: number;
    token: string;
    domain?: string;
    offset?: number;
    count?: number;
    filter?: string;
    extended?: number;
  }): Promise<{
    items: any[];
    count?: number;
    profiles?: any[];
    groups?: any[];
  }>;

  wallGetById(params: { posts: string[]; extended?: number }): Promise<{
    items: any[];
  }>;
}
