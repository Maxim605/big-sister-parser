import { Injectable, Inject } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
} from "src/infrastructure/vk/types";

@Injectable()
export class FetchVkFriendsUseCase {
  constructor(
    @Inject("IVkApiClient")
    private readonly vkApiClient: IVkApiClient,
  ) {}

  async execute(params: VkFriendsGetParams): Promise<VkFriendsGetResponse> {
    return await this.vkApiClient.friendsGet(params);
  }
}
