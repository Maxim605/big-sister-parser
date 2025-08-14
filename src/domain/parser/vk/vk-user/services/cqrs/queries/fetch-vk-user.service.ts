import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import { VkUsersGetParams, VkUsersGetResponse } from "../../../../interfaces";

@Injectable()
export class FetchVkUserService implements CQRSService {
  constructor(private readonly vkApiService: VkApiService) {}
  public async execute(params: VkUsersGetParams): Promise<VkUsersGetResponse> {
    return await this.vkApiService.usersGet(params);
  }
}
