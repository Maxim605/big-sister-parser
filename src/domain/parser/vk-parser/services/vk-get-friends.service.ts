import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import { VkFriendsGetParams, VkFriendsGetResponse } from "../interfaces";
import settings from "src/settings";

@Injectable()
export class VkApiService {
  private readonly baseUrl = settings.vkApi.baseUrl;

  constructor(private readonly httpService: HttpService) {}

  public async friendsGet(
    params: VkFriendsGetParams,
  ): Promise<VkFriendsGetResponse> {
    const query = new URLSearchParams();

    query.set("access_token", params.token);
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
    if (params.fields) {
      const fieldsArray = Array.isArray(params.fields)
        ? params.fields
        : [params.fields];
      query.set("fields", fieldsArray.join(","));
    }
    if (params.name_case) query.set("name_case", params.name_case);

    const url = `${this.baseUrl}/friends.get?${query.toString()}`;
    const response$ = this.httpService.get(url);
    const { data } = await lastValueFrom(response$);
    if (data.error) {
      throw new Error(`VK API error: ${data.error.error_msg}`);
    }
    return data.response as VkFriendsGetResponse;
  }
}
