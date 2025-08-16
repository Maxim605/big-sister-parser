import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { VkFriend } from "../../../../interfaces";

interface VkFriendData {
  id: number;
  first_name: string;
  last_name: string;
  sex: number;
  bdate: string;
  city_id: number;
  domain: string;
  photo?: string;
  country_id?: number;
  school_id?: number;
  univercity_id?: number;
  last_seen?: string;
  deactivated: number;
  is_closen: number;
  prominence?: number;
  owner_user_id: number;
}

@Injectable()
export class SaveVkFriendsService implements CQRSService {
  private readonly logger = new Logger(SaveVkFriendsService.name);
  private readonly COLLECTION_NAME = "users";

  constructor(private readonly thriftArangoService: ThriftArangoService) {}

  public async execute(
    friends: VkFriend[],
    ownerUserId: number,
  ): Promise<{ savedIds: number[]; failedIds: number[] }> {
    try {
      const savedIds: number[] = [];
      const failedIds: number[] = [];
      try {
        await this.thriftArangoService.save(this.COLLECTION_NAME, {
          _key: String(ownerUserId),
          id: ownerUserId,
        });
      } catch (e) {
        this.logger.error(
          `Ошибка при сохранении пользователя владельца ${ownerUserId}: ${e.message}`,
        );
      }
      for (const friend of friends) {
        const vkFriendData = this.mapToData(friend, ownerUserId);
        try {
          await this.thriftArangoService.save(this.COLLECTION_NAME, {
            ...vkFriendData,
            _key: String(friend.id),
          });
          await this.thriftArangoService.save("friendships", {
            _key: `${ownerUserId}_${friend.id}`,
            _from: `${this.COLLECTION_NAME}/${ownerUserId}`,
            _to: `${this.COLLECTION_NAME}/${friend.id}`,
          });
          savedIds.push(friend.id);
        } catch (e) {
          this.logger.error(
            `Ошибка при сохранении друга ${friend.id}: ${e.message}`,
          );
          failedIds.push(friend.id);
        }
      }
      friends.length = 0;
      return { savedIds, failedIds };
    } catch (e) {
      this.logger.error(`Ошибка сохранения друзей: ${e.message}`, e.stack);
      throw e;
    }
  }

  private mapToData(vkFriend: VkFriend, ownerUserId: number): VkFriendData {
    return {
      id: vkFriend.id,
      first_name: vkFriend.first_name,
      last_name: vkFriend.last_name,
      sex: vkFriend.sex || 0,
      bdate: vkFriend.bdate || "",
      city_id: vkFriend.city?.id || 0,
      domain: `vk${vkFriend.id}`,
      photo: vkFriend.photo_100 || vkFriend.photo_50 || "",
      country_id: vkFriend.country?.id,
      school_id: undefined,
      univercity_id: undefined,
      last_seen: vkFriend.last_seen
        ? new Date(vkFriend.last_seen.time * 1000).toISOString()
        : undefined,
      deactivated: vkFriend.deactivated ? 1 : 0,
      is_closen: vkFriend.is_closed ? 1 : 0,
      prominence: undefined,
      owner_user_id: ownerUserId,
    };
  }
}
