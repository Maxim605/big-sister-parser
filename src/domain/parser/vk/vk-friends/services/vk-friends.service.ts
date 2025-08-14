import { Injectable, Logger } from "@nestjs/common";
import { LoadVkFriendsService } from "./cqrs/commands/load-vk-friends.service";
import { GetVkFriendsService } from "./cqrs/queries/get-vk-friends.service";
import { VkFriendsGetParams } from "../../interfaces";

@Injectable()
export class VkFriendsService {
  private readonly logger = new Logger(VkFriendsService.name);
  constructor(
    private readonly loadVkFriends: LoadVkFriendsService,
    private readonly getVkFriends: GetVkFriendsService,
  ) {}

  public async loadFriends(
    params: VkFriendsGetParams,
  ): Promise<{ savedIds: number[]; failedIds: number[] }> {
    return await this.loadVkFriends.execute(params);
  }

  public async getFriends(user_id: number, limit?: number, offset?: number) {
    return await this.getVkFriends.execute(user_id, limit, offset);
  }
}
