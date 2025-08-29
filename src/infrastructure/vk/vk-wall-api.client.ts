import { Injectable, Inject, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import { IKeyManager } from "src/application/services/key-manager.port";
import { TOKENS } from "src/common/tokens";
import { IVkWallApiClient } from "src/application/ports/ivk-wall-api.client";
import { ApiKeyLease } from "src/application/services/key-manager.types";

export interface RateLimiter {
  acquireToken(): Promise<void>;
  onRateLimit?(info?: any): void;
}

@Injectable()
export class VkWallApiClient implements IVkWallApiClient {
  private readonly baseUrl = settings.vkApi.baseUrl.replace(/\/$/, "");

  constructor(
    private readonly http: HttpService,
    @Inject(TOKENS.IKeyManager) private readonly keyManager: IKeyManager,
    @Inject(TOKENS.RedisClient) private readonly redisClient: any,
  ) {}

  private async callWithLeasing<T>(
    method: string,
    params: Record<string, any>,
    providedToken?: string,
    rateLimiterOrLease?: RateLimiter | ApiKeyLease,
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

    // If token is explicitly provided, just call with given token
    if (providedToken) {
      if ((rateLimiterOrLease as any)?.acquireToken)
        await (rateLimiterOrLease as RateLimiter).acquireToken();
      const url = buildUrl(providedToken);
      const { data } = await lastValueFrom(this.http.get(url));
      if (data?.error)
        throw new Error(
          `VK API error ${data.error?.error_code}: ${data.error?.error_msg}`,
        );
      return (data.response ?? data) as T;
    }

    // If lease is provided, use it directly; otherwise lease via keyManager
    const lease: ApiKeyLease | null = (rateLimiterOrLease as any)?.tokenDecrypted
      ? (rateLimiterOrLease as ApiKeyLease)
      : await this.keyManager.leaseKey("vk");
    const shouldRelease = !((rateLimiterOrLease as any)?.tokenDecrypted);

    try {
      while (attempt < maxAttempts) {
        attempt++;
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
    } finally {
      if (shouldRelease) {
        try { await this.keyManager.releaseKey(lease); } catch {}
      }
    }
  }

  async wallFetch(params: {
    owner_id?: number;
    domain?: string;
    token: string;
    offset?: number;
    count?: number;
    filter?: string;
    extended?: number;
  }, lease?: ApiKeyLease): Promise<{
    items: any[];
    count?: number;
    profiles?: any[];
    groups?: any[];
  }> {
    const { token, ...rest } = params as any;
    return this.callWithLeasing("wall.get", rest, token, lease);
  }

  async wallGetById(params: {
    posts: string[];
    extended?: number;
    token?: string;
  }, lease?: ApiKeyLease): Promise<{ items: any[] }> {
    const { token, ...rest } = params as any;
    return this.callWithLeasing("wall.getById", rest, token, lease);
  }
}
