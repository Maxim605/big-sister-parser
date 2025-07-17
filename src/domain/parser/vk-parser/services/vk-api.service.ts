import { Inject, Injectable } from "@nestjs/common";
import fetch from "node-fetch";
import { FriendsGetParams, FriendsGetResponse } from "../interfaces";

@Injectable()
export class VkApiService {
  private readonly baseUrl = "https://api.vk.com/method";

  constructor(
    @Inject("VK_ACCESS_TOKEN") private readonly accessToken: string,
    @Inject("VK_API_VERSION") private readonly version: string,
  ) {}

  public async friendsGet(
    params: FriendsGetParams,
  ): Promise<FriendsGetResponse> {
    const query = new URLSearchParams();

    query.set("access_token", params.token || this.accessToken);
    query.set("v", this.version);
    query.set("user_id", params.user_id.toString());

    if (params.order) query.set("order", params.order);
    if (params.list_id) query.set("list_id", params.list_id.toString());
    if (params.count) query.set("count", params.count.toString());
    if (params.offset) query.set("offset", params.offset.toString());
    if (params.fields) query.set("fields", params.fields.join(","));
    if (params.name_case) query.set("name_case", params.name_case);

    const url = `${this.baseUrl}/friends.get?${query.toString()}`;
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `VK API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = await response.json();

    if (json.error) {
      throw new Error(`VK API error: ${json.error.error_msg}`);
    }

    return json.response as FriendsGetResponse;
  }
}
