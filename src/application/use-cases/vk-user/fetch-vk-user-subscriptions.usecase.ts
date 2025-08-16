import { Injectable, Inject } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import {
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "src/domain/parser/vk/interfaces";

@Injectable()
export class FetchVkUserSubscriptionsUseCase {
  constructor(
    @Inject("IVkApiClient")
    private readonly vkApiClient: IVkApiClient,
  ) {}

  async execute(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse> {
    return await this.vkApiClient.usersGetSubscriptions(params);
  }
}
