import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { ThriftArangoService } from "../../../../../../thrift/services/thrift-arango.service";
import { VkFriend } from "../../../interfaces";
import { VkFriendEntity } from "../../../entities";
import { lastValueFrom } from "rxjs";

@Injectable()
export class SaveVkFriendsService implements CQRSService {
  private readonly logger = new Logger(SaveVkFriendsService.name);
  private readonly COLLECTION_NAME = "users";

  constructor(private readonly thriftArangoService: ThriftArangoService) {}

  public async execute(
    friends: VkFriend[],
    ownerUserId: number,
  ): Promise<void> {
    try {
      for (const friend of friends) {
        const vkFriendEntity = this.mapToEntity(friend, ownerUserId);
        try {
          const result = await this.thriftArangoService.save(
            this.COLLECTION_NAME,
            vkFriendEntity,
          );
        } catch (e) {
          this.logger.error(
            `Ошибка при сохранении друга ${friend.id}: ${e.message}`,
          );
        }
      }
      friends.length = 0;
    } catch (e) {
      this.logger.error(`Ошибка сохранения друзей: ${e.message}`, e.stack);
      throw e;
    }
  }

  private mapToEntity(vkFriend: VkFriend, ownerUserId: number): VkFriendEntity {
    return {
      id: vkFriend.id,
      first_name: vkFriend.first_name,
      last_name: vkFriend.last_name,
      sex: vkFriend.sex || 0,
      bdate: vkFriend.bdate || "",
      city_id: vkFriend.city?.id || 0,
      domain: `vk${vkFriend.id}`, // Генерируем домен на основе ID
      photo: vkFriend.photo_100 || vkFriend.photo_50 || "",
      country_id: vkFriend.country?.id,
      school_id: undefined, // Не предоставляется VK API
      univercity_id: undefined, // Не предоставляется VK API
      last_seen: vkFriend.last_seen
        ? new Date(vkFriend.last_seen.time * 1000).toISOString()
        : undefined,
      deactivated: vkFriend.deactivated ? 1 : 0,
      is_closen: vkFriend.is_closed ? 1 : 0,
      prominence: undefined, // Будет рассчитано позже
      owner_user_id: ownerUserId,
    };
  }
}
