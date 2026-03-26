import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import { IVkInteractionsApiClient } from "src/application/ports/ivk-interactions-api.client";
import {
  VkApiError,
  VkLikesGetListParams,
  VkLikesGetListResponse,
  VkWallGetCommentsParams,
  VkWallGetCommentsResponse,
} from "src/infrastructure/vk/types";

@Injectable()
export class VkInteractionsApiClient implements IVkInteractionsApiClient {
  private readonly logger = new Logger(VkInteractionsApiClient.name);
  private readonly baseUrl = settings.vkApi.baseUrl.replace(/\/$/, "");
  private readonly version = settings.vkApi.version;

  constructor(private readonly http: HttpService) {}

  private async call<T>(method: string, params: Record<string, any>, token: string): Promise<T> {
    await new Promise((r) => setTimeout(r, 340));
    const query = new URLSearchParams();
    query.set("access_token", token);
    query.set("v", this.version);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) query.set(k, v.join(","));
      else query.set(k, String(v));
    }
    const url = `${this.baseUrl}/${method}?${query}`;
    try {
      const { data } = await lastValueFrom(this.http.get(url));
      if (data?.error) {
        throw new VkApiError(Number(data.error.error_code) || 0, data.error.error_msg || "VK API error");
      }
      return (data.response ?? data) as T;
    } catch (e: any) {
      if (e instanceof VkApiError) throw e;
      this.logger.error(`VK API call ${method} failed: ${e.message}`);
      throw e;
    }
  }

  async likesGetList(params: VkLikesGetListParams): Promise<VkLikesGetListResponse> {
    const { access_token, ...rest } = params;
    return this.call<VkLikesGetListResponse>("likes.getList", rest, access_token);
  }

  async wallGetComments(params: VkWallGetCommentsParams): Promise<VkWallGetCommentsResponse> {
    const { access_token, ...rest } = params;
    return this.call<VkWallGetCommentsResponse>("wall.getComments", rest, access_token);
  }
}
