import { Injectable, Logger } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { VkApiService } from "../../../../services/vk-api.service";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { VkUsersGetSubscriptionsParams } from "../../../../interfaces";

@Injectable()
export class LoadVkUserSubscriptionsService implements CQRSService {
  private readonly logger = new Logger(LoadVkUserSubscriptionsService.name);
  private readonly USERS = "users";
  private readonly GROUPS = "groups";
  private readonly SUBSCRIPTIONS = "subscriptions";

  constructor(
    private readonly vkApiService: VkApiService,
    private readonly thriftArangoService: ThriftArangoService,
  ) {}

  public async execute(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<{
    savedUserIds: number[];
    savedGroupIds: number[];
    savedSubscriptionKeys: string[];
  }> {
    await this.thriftArangoService.save(this.USERS, {
      _key: String(params.user_id),
      id: params.user_id,
    });

    const res = await this.vkApiService.usersGetSubscriptions(params);
    const groupsBlock: any = (res as any).groups ?? res;
    const groupItems: any[] = groupsBlock?.items ?? [];
    const savedGroupIds: number[] = [];
    const savedSubscriptionKeys: string[] = [];
    const savedUserIds: number[] = [params.user_id];
    for (const item of groupItems) {
      const groupId = typeof item === "number" ? item : item.id;
      const fields = typeof item === "number" ? {} : item;
      await this.thriftArangoService.save(this.GROUPS, {
        _key: String(groupId),
        id: groupId,
        ...fields,
      });
      await this.thriftArangoService.save(this.SUBSCRIPTIONS, {
        _key: `${params.user_id}_${groupId}`,
        _from: `${this.USERS}/${params.user_id}`,
        _to: `${this.GROUPS}/${groupId}`,
      });
      savedGroupIds.push(groupId);
      savedSubscriptionKeys.push(`${params.user_id}_${groupId}`);
    }
    return { savedUserIds, savedGroupIds, savedSubscriptionKeys };
  }
}
