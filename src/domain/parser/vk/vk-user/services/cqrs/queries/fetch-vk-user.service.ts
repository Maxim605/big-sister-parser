import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "src/infrastructure/vk/vk-api.service";
import { VkUsersGetParams, VkUsersGetResponse } from "../../../../interfaces";
import { VK_FETCH_DELAY } from "src/constants";

@Injectable()
export class FetchVkUserService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(params: VkUsersGetParams): Promise<VkUsersGetResponse> {
    const res = await this.vkApiService.usersGet(params);
    await new Promise((r) => setTimeout(r, VK_FETCH_DELAY));
    return res;
  }
}
