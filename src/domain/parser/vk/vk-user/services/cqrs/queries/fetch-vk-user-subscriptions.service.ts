import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import {
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "../../../../interfaces";
import { VK_FETCH_DELAY } from "src/constants";

@Injectable()
export class FetchVkUserSubscriptionsService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse> {
    const res = await this.vkApiService.usersGetSubscriptions(params);
    await new Promise((r) => setTimeout(r, VK_FETCH_DELAY));
    return res;
  }
}
