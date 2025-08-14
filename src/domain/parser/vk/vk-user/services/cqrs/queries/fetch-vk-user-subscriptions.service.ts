import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import {
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "../../../../interfaces";

@Injectable()
export class FetchVkUserSubscriptionsService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse> {
    return await this.vkApiService.usersGetSubscriptions(params);
  }
}
