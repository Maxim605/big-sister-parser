import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
} from "../../../../interfaces";
import { VK_FETCH_DELAY } from "src/constants";

@Injectable()
export class FetchVkFriendsService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(
    params: VkFriendsGetParams,
  ): Promise<VkFriendsGetResponse> {
    if (params.count == null && params.offset == null) {
      const batchSize = 100;
      let offset = 0;
      let allItems: any[] = [];
      let total = 0;
      for (;;) {
        const res = await this.vkApiService.friendsGet({ ...params, count: batchSize, offset });
        total = res.count;
        const items = res.items ?? [];
        allItems = allItems.concat(items);
        offset += batchSize;
        await new Promise((r) => setTimeout(r, VK_FETCH_DELAY));
        if (items.length < batchSize || allItems.length >= total) break;
      }
      return { count: total, items: allItems } as VkFriendsGetResponse;
    }
    const single = await this.vkApiService.friendsGet(params);
    await new Promise((r) => setTimeout(r, VK_FETCH_DELAY));
    return single;
  }
}
