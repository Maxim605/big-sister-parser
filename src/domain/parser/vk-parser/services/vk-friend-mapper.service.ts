import { Injectable } from "@nestjs/common";
import { VkFriendEntity } from "../entities/vk-friend.entity";
import { VkFriendDto } from "../dto/vk-friend.dto";

@Injectable()
export class VkFriendMapperService {
  public mapToDto(entity: VkFriendEntity): VkFriendDto {
    return {
      id: entity.id,
      first_name: entity.first_name,
      last_name: entity.last_name,
      deactivated: entity.deactivated ? "deleted" : undefined,
      hidden: undefined,
      bdate: entity.bdate,
      sex: entity.sex,
      city: entity.city_id ? { id: entity.city_id, title: "" } : undefined,
      country: entity.country_id
        ? { id: entity.country_id, title: "" }
        : undefined,
      online: undefined,
      last_seen: entity.last_seen
        ? {
            time: new Date(entity.last_seen).getTime() / 1000,
            platform: 0,
          }
        : undefined,
      photo_50: entity.photo,
      photo_100: entity.photo,
      photo_200_orig: entity.photo,
      is_closed: entity.is_closen === 1,
      can_access_closed: true,
    };
  }

  public mapArrayToDto(entities: VkFriendEntity[]): VkFriendDto[] {
    return entities.map((entity) => this.mapToDto(entity));
  }
}
