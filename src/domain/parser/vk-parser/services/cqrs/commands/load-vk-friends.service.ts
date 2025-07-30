import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../vk-get-friends.service";
import { SaveVkFriendsService } from "./save-vk-friends.service";
import { VkFriendsGetParams } from "../../../interfaces";

@Injectable()
export class LoadVkFriendsService implements CQRSService {
  private readonly logger = new Logger(LoadVkFriendsService.name);

  constructor(
    private readonly vkApiService: VkApiService,
    private readonly saveVkFriends: SaveVkFriendsService,
  ) {}

  public async execute(params: VkFriendsGetParams): Promise<void> {
    try {
      const friendsData = await this.vkApiService.friendsGet(params);
      if (friendsData.items && friendsData.items.length > 0) {
        const friends = friendsData.items.filter(
          (item): item is any => typeof item === "object" && item !== null,
        );

        await this.saveVkFriends.execute(friends, params.user_id);
        friends.length = 0;
      }
    } catch (e) {
      this.logger.error(`Ошибка загрузки друзей: ${e.message}`, e.stack);
      throw e;
    }
  }
}
