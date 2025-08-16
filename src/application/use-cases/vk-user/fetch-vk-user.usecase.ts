import { Injectable, Inject } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import {
  VkUsersGetParams,
  VkUsersGetResponse,
} from "src/domain/parser/vk/interfaces";

@Injectable()
export class FetchVkUserUseCase {
  constructor(
    @Inject("IVkApiClient")
    private readonly vkApiClient: IVkApiClient,
  ) {}

  async execute(params: VkUsersGetParams): Promise<VkUsersGetResponse> {
    return await this.vkApiClient.usersGet(params);
  }
}
