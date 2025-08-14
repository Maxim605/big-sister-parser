import { Injectable } from "@nestjs/common";
import { HttpModule, HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import settings from "src/settings";
import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
  VkUsersGetParams,
  VkUsersGetResponse,
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "../interfaces";

@Injectable()
export class VkApiService {
  private readonly baseUrl = settings.vkApi.baseUrl;
  constructor(private readonly httpService: HttpService) {}

  public async friendsGet(
    params: VkFriendsGetParams,
  ): Promise<VkFriendsGetResponse> {
    const query = new URLSearchParams();
    query.set(
      "access_token",
      (params as any).access_token ?? (params as any).token,
    );
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
    const url = `${this.baseUrl}/friends.get?${query.toString()}`;
    const { data } = await lastValueFrom(this.httpService.get(url));
    if (data.error) throw new Error(`VK API error: ${data.error.error_msg}`);
    return data.response as VkFriendsGetResponse;
  }

  public async usersGet(params: VkUsersGetParams): Promise<VkUsersGetResponse> {
    const query = new URLSearchParams();
    query.set(
      "access_token",
      (params as any).access_token ?? (params as any).token,
    );
    query.set("v", settings.vkApi.version);
    query.set("user_ids", params.user_id.toString());
    if (params.fields && params.fields.length > 0)
      query.set("fields", params.fields.join(","));
    if (params.name_case) query.set("name_case", params.name_case);
    const url = `${this.baseUrl}/users.get?${query.toString()}`;
    const { data } = await lastValueFrom(this.httpService.get(url));
    if (data.error) throw new Error(`VK API error: ${data.error.error_msg}`);
    return data as VkUsersGetResponse;
  }

  public async usersGetSubscriptions(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse> {
    const query = new URLSearchParams();
    query.set(
      "access_token",
      (params as any).access_token ?? (params as any).token,
    );
    query.set("v", settings.vkApi.version);
    query.set("user_id", params.user_id.toString());
    if (params.extended !== undefined)
      query.set("extended", params.extended ? "1" : "0");
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    if (params.count !== undefined) query.set("count", String(params.count));
    if (params.fields && params.fields.length > 0)
      query.set("fields", params.fields.join(","));
    const url = `${this.baseUrl}/users.getSubscriptions?${query.toString()}`;
    const { data } = await lastValueFrom(this.httpService.get(url));
    if (data.error) throw new Error(`VK API error: ${data.error.error_msg}`);
    return data.response as VkUsersGetSubscriptionsResponse;
  }
}
