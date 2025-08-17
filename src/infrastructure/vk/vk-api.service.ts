import { Injectable, Inject, Logger } from "@nestjs/common";
import { HttpModule, HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
  VkUsersGetParams,
  VkUsersGetResponse,
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "src/infrastructure/vk/types";
import { TOKENS } from "src/common/tokens";
import { IKeyManager } from "src/application/services/key-manager.port";

@Injectable()
export class VkApiService implements IVkApiClient {
  private readonly baseUrl = settings.vkApi.baseUrl;
  private readonly logger = new Logger(VkApiService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(TOKENS.IKeyManager) private readonly keyManager: IKeyManager,
  ) {}

  private async getWithLeasing<T>(
    makeUrl: (token: string) => string,
    providedToken?: string,
  ): Promise<T> {
    if (providedToken) {
      const url = makeUrl(providedToken);
      const { data } = await lastValueFrom(this.httpService.get(url));
      if (data.error) throw new Error(`VK API error: ${data.error.error_msg}`);
      return data.response ?? data;
    }

    const lease = await this.keyManager.leaseKey("vk");
    let attempt = 0;
    const maxAttempts = 5;
    let lastError: any;
    try {
      while (attempt < maxAttempts) {
        attempt++;
        const url = makeUrl(lease.tokenDecrypted);
        try {
          const resp = await lastValueFrom(this.httpService.get(url));
          const result = resp.data;
          if (result?.error) {
            const errMsg = result.error.error_msg || "VK API error";
            await this.keyManager.releaseKey(lease, { statusCode: 400 });
            throw new Error(`VK API error: ${errMsg}`);
          }
          await this.keyManager.releaseKey(lease, {
            statusCode: resp.status,
            headers: resp.headers as any,
          });
          return (result.response ?? result) as T;
        } catch (e: any) {
          const status: number = e?.response?.status ?? 0;
          const headers: Record<string, any> | undefined = e?.response?.headers;
          await this.keyManager.releaseKey(lease, {
            statusCode: status,
            headers: headers as any,
            error: e,
          });

          lastError = e;
          if (status === 429 || status >= 500 || status === 0) {
            const retryAfter = Number(headers?.["retry-after"] ?? 1);
            const backoff = Math.min(5, retryAfter || attempt) * 1000;
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          throw e;
        }
      }
      throw lastError ?? new Error("VK API call failed after retries");
    } catch (err) {
      throw err;
    }
  }

  public async friendsGet(
    params: VkFriendsGetParams,
  ): Promise<VkFriendsGetResponse> {
    const token = (params as any).access_token ?? (params as any).token;
    const urlBuilder = (t: string) => {
      const query = new URLSearchParams();
      query.set("access_token", t);
      query.set("v", settings.vkApi.version);
      query.set("user_id", params.user_id.toString());
      if (params.order) query.set("order", params.order);
      if (params.list_id) {
        const listIdArray = Array.isArray(params.list_id)
          ? params.list_id
          : [params.list_id];
        query.set("list_id", listIdArray.join(","));
      }
      if (params.count) query.set("count", params.count.toString());
      if (params.offset) query.set("offset", params.offset.toString());
      if (params.fields && params.fields.length > 0)
        query.set("fields", params.fields.join(","));
      if (params.name_case) query.set("name_case", params.name_case);
      return `${this.baseUrl}/friends.get?${query.toString()}`;
    };

    return (await this.getWithLeasing<VkFriendsGetResponse>(
      urlBuilder,
      token,
    )) as VkFriendsGetResponse;
  }

  public async usersGet(params: VkUsersGetParams): Promise<VkUsersGetResponse> {
    const token = (params as any).access_token ?? (params as any).token;
    const urlBuilder = (t: string) => {
      const query = new URLSearchParams();
      query.set("access_token", t);
      query.set("v", settings.vkApi.version);
      query.set("user_ids", params.user_id.toString());
      if (params.fields && params.fields.length > 0)
        query.set("fields", params.fields.join(","));
      if (params.name_case) query.set("name_case", params.name_case);
      return `${this.baseUrl}/users.get?${query.toString()}`;
    };

    return (await this.getWithLeasing<VkUsersGetResponse>(
      urlBuilder,
      token,
    )) as VkUsersGetResponse;
  }

  public async usersGetSubscriptions(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse> {
    const token = (params as any).access_token ?? (params as any).token;
    const urlBuilder = (t: string) => {
      const query = new URLSearchParams();
      query.set("access_token", t);
      query.set("v", settings.vkApi.version);
      query.set("user_id", params.user_id.toString());
      if (params.extended !== undefined)
        query.set("extended", params.extended ? "1" : "0");
      if (params.offset !== undefined)
        query.set("offset", String(params.offset));
      if (params.count !== undefined) query.set("count", String(params.count));
      if (params.fields && params.fields.length > 0)
        query.set("fields", params.fields.join(","));
      return `${this.baseUrl}/users.getSubscriptions?${query.toString()}`;
    };

    return (await this.getWithLeasing<VkUsersGetSubscriptionsResponse>(
      urlBuilder,
      token,
    )) as VkUsersGetSubscriptionsResponse;
  }
}
