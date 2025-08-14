import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { VkUsersGetParams } from "../../../../interfaces";

@Injectable()
export class LoadVkUserService implements CQRSService {
  private readonly logger = new Logger(LoadVkUserService.name);
  private readonly USERS = "users";
  constructor(
    private readonly vkApiService: VkApiService,
    private readonly thriftArangoService: ThriftArangoService,
  ) {}

  public async execute(
    params: VkUsersGetParams,
  ): Promise<{ savedIds: number[] }> {
    const res = await this.vkApiService.usersGet(params);
    const user = (res.response ?? res.items ?? [])[0];
    if (!user) return { savedIds: [] };
    await this.thriftArangoService.save(this.USERS, {
      _key: String(user.id),
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
    });
    return { savedIds: [user.id] };
  }
}
