import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
} from "../../../../interfaces";

@Injectable()
export class FetchVkFriendsService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(
    params: VkFriendsGetParams,
  ): Promise<VkFriendsGetResponse> {
    return await this.vkApiService.friendsGet(params);
  }
}
