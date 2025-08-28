import { Injectable, Inject, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import { IKeyManager } from "src/application/services/key-manager.port";
import { TOKENS } from "src/common/tokens";
import { IVkWallApiClient } from "./ivk-api.client";

export interface RateLimiter {
  acquireToken(): Promise<void>;
  onRateLimit?(info?: any): void;
}

@Injectable()
export class VkWallApiClient implements IVkWallApiClient {
  private readonly baseUrl = settings.vkApi.baseUrl.replace(/\/$/, "");
  private readonly logger = new Logger(VkWallApiClient.name);

  constructor(
    private readonly http: HttpService,
    @Inject(TOKENS.IKeyManager) private readonly keyManager: IKeyManager,
    @Inject(TOKENS.RedisClient) private readonly redisClient: any,
  ) {}

  private async callWithLeasing<T>(
    method: string,
    params: Record<string, any>,
    providedToken?: string,
    rateLimiter?: RateLimiter,
  ): Promise<T> {
    const maxAttempts = 5;
    let attempt = 0;
    let lastErr: any;

    const buildUrl = (token: string) => {
      const query = new URLSearchParams();
      query.set("access_token", token);
      query.set("v", settings.vkApi.version);
      for (const [k, vRaw] of Object.entries(params || {})) {
        if (vRaw === undefined || vRaw === null) continue;
        let v: any = vRaw;
        if (k === "count" || k === "offset") {
          const n = Math.trunc(Number(vRaw));
          if (!Number.isFinite(n) || n < 0) continue;
          v = n;
        }
        if (Array.isArray(v)) query.set(k, v.join(","));
        else query.set(k, String(v));
      }
      return `${this.baseUrl}/${method}?${query}`;
    };

    if (providedToken) {
      if (rateLimiter) await rateLimiter.acquireToken();
      const url = buildUrl(providedToken);
      const { data } = await lastValueFrom(this.http.get(url));
      if (data?.error)
        throw new Error(
          `VK API error ${data.error?.error_code}: ${data.error?.error_msg}`,
        );
      return (data.response ?? data) as T;
    }

    const lease = await this.keyManager.leaseKey("vk");
    try {
      while (attempt < maxAttempts) {
        attempt++;
        if (rateLimiter) await rateLimiter.acquireToken();
        const url = buildUrl(lease.tokenDecrypted);
        try {
          const resp = await lastValueFrom(this.http.get(url));
          const payload = resp.data;
          if (payload?.error) {
            const code = Number(payload.error.error_code) || 0;
            const msg = String(payload.error.error_msg || "VK API error");
            await this.keyManager.releaseKey(lease, {
              statusCode: resp.status,
              headers: resp.headers as any,
              error: payload.error,
            });
            if (code === 6) { /* TOO_MANY_REQUESTS */
              rateLimiter?.onRateLimit?.({ code, attempt });
              const backoff = Math.min(5, attempt) * 1000;
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            }
            if (code >= 500) {
              const backoff = Math.min(5, attempt) * 1000;
              await new Promise((r) => setTimeout(r, backoff));
              continue;
            }
            throw new Error(`VK API ${method} error ${code}: ${msg}`);
          }

          await this.keyManager.releaseKey(lease, {
            statusCode: resp.status,
            headers: resp.headers as any,
          });
          return (payload.response ?? payload) as T;
        } catch (e: any) {
          const status: number = e?.response?.status ?? 0;
          const headers: Record<string, any> | undefined = e?.response?.headers;
          await this.keyManager.releaseKey(lease, {
            statusCode: status,
            headers: headers as any,
            error: e,
          });

          lastErr = e;
          if (status === 429 || status >= 500 || status === 0) {
            rateLimiter?.onRateLimit?.({ status, attempt });
            const retryAfter = Number(headers?.["retry-after"] ?? 0);
            const backoff = Math.max(
              retryAfter * 1000,
              Math.min(5000, attempt * 1000),
            );
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          throw e;
        }
      }
      throw lastErr ?? new Error("VK API call failed after retries");
    } finally {}
  }

  async wallFetch(params: {
    owner_id?: number;
    domain?: string;
    token: string;
    offset?: number;
    count?: number;
    filter?: string;
    extended?: number;
  }): Promise<{
    items: any[];
    count?: number;
    profiles?: any[];
    groups?: any[];
  }> {
    const { token, ...rest } = params as any;
    return this.callWithLeasing("wall.get", rest, token);
  }

  async wallGetById(params: {
    posts: string[];
    extended?: number;
    token?: string;
  }): Promise<{ items: any[] }> {
    const { token, ...rest } = params as any;
    return this.callWithLeasing("wall.getById", rest, token);
  }
}
