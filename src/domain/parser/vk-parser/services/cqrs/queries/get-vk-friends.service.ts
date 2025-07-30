import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { ThriftArangoService } from "../../../../../../thrift/services/thrift-arango.service";
import { VkFriendEntity } from "../../../entities";
import { VkFriendsGetResponseDto } from "../../../dto/vk-friends-get-response.dto";
import { VkFriendMapperService } from "../../vk-friend-mapper.service";

@Injectable()
export class GetVkFriendsService implements CQRSService {
  private readonly logger = new Logger(GetVkFriendsService.name);
  private readonly COLLECTION_NAME = "users";

  constructor(
    private readonly thriftArangoService: ThriftArangoService,
    private readonly mapperService: VkFriendMapperService,
  ) {}

  public async execute(
    ownerUserId: number,
    limit: number = 100,
    offset: number = 0,
  ): Promise<VkFriendsGetResponseDto> {
    try {
      const response = await this.thriftArangoService.get(
        this.COLLECTION_NAME,
        ownerUserId.toString(),
      );
      const friends = response.fields
        ? [response.fields as VkFriendEntity]
        : [];
      const friendDtos = this.mapperService.mapArrayToDto(friends);
      return {
        count: response.count ?? friends.length,
        items: friendDtos,
      };
    } catch (e) {
      this.logger.error(`Ошибка получения друзей: ${e.message}`, e.stack);
      throw e;
    }
  }
}
