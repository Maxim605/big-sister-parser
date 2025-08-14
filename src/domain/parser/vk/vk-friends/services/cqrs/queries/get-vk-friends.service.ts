import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { VkFriendsGetResponseDto } from "../../../dto/vk-friends-get-response.dto";

@Injectable()
export class GetVkFriendsService implements CQRSService {
  private readonly COLLECTION_NAME = "users";
  constructor(private readonly thriftArangoService: ThriftArangoService) {}

  public async execute(
    user_id: number,
    limit?: number,
    offset?: number,
  ): Promise<VkFriendsGetResponseDto> {
    return { count: 0, items: [] };
  }
}
