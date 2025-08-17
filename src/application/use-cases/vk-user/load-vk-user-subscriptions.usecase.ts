import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import { TOKENS } from "src/common/tokens";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import { IGroupRepository } from "src/domain/repositories/igroup.repository";
import { ISubscriptionRepository } from "src/domain/repositories/isubscription.repository";
import {
  VkUsersGetSubscriptionsParams,
  VkGroupInfo,
} from "src/infrastructure/vk/types";
import { VkUser } from "src/domain/entities/vk-user";
import { VkGroup } from "src/domain/entities/vk-group";

@Injectable()
export class LoadVkUserSubscriptionsUseCase {
  private readonly logger = new Logger(LoadVkUserSubscriptionsUseCase.name);

  constructor(
    @Inject("IVkApiClient") private readonly api: IVkApiClient,
    @Inject(TOKENS.IUserRepository) private readonly users: IUserRepository,
    @Inject(TOKENS.IGroupRepository) private readonly groups: IGroupRepository,
    @Inject(TOKENS.ISubscriptionRepository)
    private readonly subs: ISubscriptionRepository,
  ) {}

  async execute(params: VkUsersGetSubscriptionsParams): Promise<{
    processedGroups: number;
    groupIds: number[];
  }> {
    const userId = params.user_id;

    try {
      await this.users.save(new VkUser(userId, "", ""));
    } catch (e: any) {
      this.logger.warn(`Failed to upsert user ${userId}: ${e.message}`);
    }

    const res = await this.api.usersGetSubscriptions({
      ...params,
      extended: true,
    });
    const items = res?.groups?.items ?? [];

    const groupIds: number[] = [];
    const toSave: VkGroup[] = [];

    for (const it of items) {
      if (typeof it === "number") {
        groupIds.push(it);
        toSave.push(new VkGroup(it, String(it), String(it)));
      } else if (it && typeof it === "object") {
        const g = it as VkGroupInfo;
        groupIds.push(g.id);
        toSave.push(
          new VkGroup(
            g.id,
            g.name ?? String(g.id),
            g.screen_name ?? String(g.id),
          ),
        );
      }
    }

    for (const g of toSave) {
      try {
        await this.groups.save(g);
      } catch (e: any) {
        this.logger.warn(`Failed to upsert group ${g.id}: ${e.message}`);
      }
    }

    try {
      await this.subs.upsertUserGroups(userId, groupIds);
    } catch (e: any) {
      this.logger.error(
        `Failed to upsert subscriptions for ${userId}: ${e.message}`,
      );
    }

    return { processedGroups: groupIds.length, groupIds };
  }
}
