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
    groupIdsPreview: number[];
  }> {
    const userId = params.user_id;

    try {
      await this.users.save(new VkUser(userId, "", ""));
    } catch (e: any) {
      this.logger.warn(`Failed to upsert user ${userId}: ${e.message}`);
    }

    const pageSize = Math.min(Math.max(params.count ?? 200, 1), 200); // VK ограничивает до 200
    let offset = params.offset ?? 0;

    let totalCount: number | undefined;
    let page = 0;
    let processed = 0;
    const preview: number[] = [];
    let resetDone = false;

    while (true) {
      const res = await this.api.usersGetSubscriptions({
        ...params,
        extended: true,
        offset,
        count: pageSize,
      });

      const items = res?.groups?.items ?? [];
      const groupsCount = (res as any)?.groups?.count ?? -1;
      if (totalCount === undefined && groupsCount >= 0)
        totalCount = groupsCount;

      if (!Array.isArray(items) || items.length === 0) break;

      const chunkIds: number[] = [];
      const chunkGroups: VkGroup[] = [];
      for (const it of items) {
        if (typeof it === "number") {
          chunkIds.push(it);
          chunkGroups.push(new VkGroup(it, String(it), String(it)));
        } else if (it && typeof it === "object") {
          const g = it as VkGroupInfo;
          chunkIds.push(g.id);
          chunkGroups.push(
            new VkGroup(
              g.id,
              g.name ?? String(g.id),
              g.screen_name ?? String(g.id),
            ),
          );
        }
      }
      const uniqueIds = Array.from(new Set(chunkIds));
      const map = new Map<number, VkGroup>();
      for (const g of chunkGroups) map.set(g.id, g);
      const uniqueGroups = Array.from(map.values());

      try {
        await this.groups.saveMany(uniqueGroups);
      } catch (e: any) {
        this.logger.warn(
          `Failed to upsert groups batch size=${uniqueGroups.length}: ${e?.message}`,
        );
      }

      try {
        if (!resetDone) {
          await this.subs.resetUserGroups(userId);
          resetDone = true;
        }
        await this.subs.addUserGroups(userId, uniqueIds);
      } catch (e: any) {
        this.logger.error(
          `Failed to add subscriptions chunk for ${userId}: ${e.message}`,
        );
      }

      processed += uniqueIds.length;
      for (const id of uniqueIds) {
        if (preview.length < 50) preview.push(id);
      }

      offset += items.length;
      page++;

      if (totalCount !== undefined && offset >= totalCount) break;
      if (items.length < pageSize) break;
    }

    return { processedGroups: processed, groupIdsPreview: preview };
  }
}
