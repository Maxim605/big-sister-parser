import { Injectable, Logger } from "@nestjs/common";
import { LoadVkFriendsService } from "./cqrs/commands/load-vk-friends.service";
import { VkFriendsGetParams } from "src/domain/parser/vk/interfaces";

@Injectable()
export class VkFriendsService {
  private readonly logger = new Logger(VkFriendsService.name);
  constructor(private readonly loadVkFriends: LoadVkFriendsService) {}

  public async loadFriends(
    params: VkFriendsGetParams,
  ): Promise<{ savedIds: number[]; failedIds: number[] }> {
    return await this.loadVkFriends.execute(params);
  }
}
