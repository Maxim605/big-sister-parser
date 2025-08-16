import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import { TOKENS } from "src/common/tokens";
import { IFriendshipRepository } from "src/domain/repositories/ifriendship.repository";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import { VkUser } from "src/domain/entities/vk-user";
import { VkFriendsGetParams } from "src/domain/parser/vk/interfaces";

@Injectable()
export class LoadVkFriendsUseCase {
  private readonly logger = new Logger(LoadVkFriendsUseCase.name);

  constructor(
    @Inject("IVkApiClient") private readonly api: IVkApiClient,
    @Inject(TOKENS.IUserRepository) private readonly users: IUserRepository,
    @Inject(TOKENS.IFriendshipRepository)
    private readonly friendships: IFriendshipRepository,
  ) {}

  async execute(
    params: VkFriendsGetParams,
  ): Promise<{ savedIds: number[]; failedIds: number[] }> {
    const savedIds: number[] = [];
    const failedIds: number[] = [];

    const pageSize = params.count ?? 500;
    let offset = params.offset ?? 0;

    try {
      await this.users.save(new VkUser(params.user_id, "", ""));
    } catch (e: any) {
      this.logger.warn(`Failed to upsert root user ${params.user_id}: ${e.message}`);
    }

    try {
      await this.friendships.deleteAllForUser(params.user_id);
    } catch (e: any) {
      this.logger.warn(`Failed to clear existing edges for ${params.user_id}: ${e.message}`);
    }

    const defaultFields = ["id", "first_name", "last_name", "domain"];

    while (true) {
      const res = await this.api.friendsGet({
        ...params,
        count: pageSize,
        offset,
        fields:
          params.fields && params.fields.length > 0
            ? params.fields
            : defaultFields,
      });

      const items = res.items ?? [];
      if (!items.length) break;

      const friendIds: number[] = [];

      for (const it of items as any[]) {
        try {
          if (typeof it === "number") {
            await this.users.save(new VkUser(it, "", ""));
            friendIds.push(it);
            savedIds.push(it);
          } else if (it && typeof it === "object") {
            friendIds.push(it.id);
            const user = new VkUser(
              it.id,
              it.first_name ?? "",
              it.last_name ?? "",
              it.domain ?? undefined,
            );
            await this.users.save(user);
            savedIds.push(it.id);
          }
        } catch (e: any) {
          const id = typeof it === "number" ? it : it.id;
          this.logger.error(`Failed to upsert user ${id}: ${e.message}`);
          failedIds.push(id);
        }
      }

      if (friendIds.length) {
        try {
          await this.friendships.saveEdges(params.user_id, friendIds);
        } catch (e: any) {
          this.logger.error(
            `Failed to save edges for ${params.user_id}: ${e.message}`,
          );
        }
      }

      if (items.length < pageSize) break;
      offset += items.length;
    }

    return { savedIds, failedIds };
  }
}
