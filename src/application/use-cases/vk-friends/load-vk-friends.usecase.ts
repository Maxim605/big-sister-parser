import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import { TOKENS } from "src/common/tokens";
import { IFriendshipRepository } from "src/domain/repositories/ifriendship.repository";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import { VkUser } from "src/domain/entities/vk-user";
import { VkFriendsGetParams, VkApiError } from "src/infrastructure/vk/types";

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
    params: VkFriendsGetParams & { rewrite?: boolean },
    opts?: {
      onBatch?: (stats: {
        savedUsers: number;
        savedEdges: number;
      }) => Promise<void> | void;
      onError?: (err: Error) => Promise<void> | void;
      onLog?: (
        msg: string,
        level?: "info" | "warn" | "error",
      ) => Promise<void> | void;
    },
  ): Promise<{
    processed: number;
    failed: number;
    failedDetails: Array<{ id: number; reason: string }>;
    alreadySaved?: boolean;
  }> {
    const rewrite = params.rewrite ?? false;

    if (!rewrite) {
      try {
        const user = await this.users.findById(params.user_id);
        if (
          user &&
          user.friends_added !== undefined &&
          user.friends_added !== null &&
          user.friends_added !== ""
        ) {
          const friendsAddedStr = String(user.friends_added);
          if (!friendsAddedStr.startsWith("err:")) {
            this.logger.log(
              `User ${params.user_id} friends already saved (friends_added: ${friendsAddedStr}), skipping`,
            );
            return {
              processed: 0,
              failed: 0,
              failedDetails: [],
              alreadySaved: true,
            };
          }
        }
      } catch (e: any) {
        this.logger.warn(
          `Failed to check user ${params.user_id} before load: ${
            e?.message || e
          }`,
        );
      }
    }
    let processed = 0;
    let failed = 0;
    const failedDetails: Array<{ id: number; reason: string }> = [];

    const pageSize = params.count ?? 500;
    let offset = params.offset ?? 0;

    // Проверяем существование пользователя, создаем только если его нет
    let existingUser: VkUser | null = null;
    try {
      existingUser = await this.users.findById(params.user_id);
      if (!existingUser) {
        // Создаем пользователя только если его нет
        await this.users.save(new VkUser(params.user_id, "", ""));
      }
    } catch (e: any) {
      this.logger.warn(
        `Failed to check/upsert root user ${params.user_id}: ${e.message}`,
      );
    }

    const defaultFields = ["id", "first_name", "last_name", "domain"];
    const allFriendIds: number[] = [];

    try {
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
        const usersToUpsert: VkUser[] = [];

        for (const it of items) {
          try {
            if (typeof it === "number") {
              usersToUpsert.push(new VkUser(it, "", ""));
              friendIds.push(it);
              processed += 1;
            } else if (it && typeof it === "object") {
              friendIds.push(it.id);
              const user = new VkUser(
                it.id,
                it.first_name ?? "",
                it.last_name ?? "",
                (it as any).domain ?? undefined,
              );
              usersToUpsert.push(user);
              processed += 1;
            }
          } catch (e: any) {
            const id = typeof it === "number" ? it : it.id;
            this.logger.error(`Failed to prepare user ${id}: ${e.message}`);
            failed += 1;
            failedDetails.push({ id, reason: `prepare: ${e.message}` });
          }
        }

        try {
          await this.users.saveMany(usersToUpsert);
          if (opts?.onBatch)
            await opts.onBatch({
              savedUsers: usersToUpsert.length,
              savedEdges: friendIds.length,
            });
        } catch (e: any) {
          this.logger.error(
            `Batch upsert failed for ${usersToUpsert.length} users: ${e.message}`,
          );
          if (opts?.onLog)
            await opts.onLog(
              `Batch upsert failed for ${usersToUpsert.length} users: ${e.message}`,
              "error",
            );
          for (const u of usersToUpsert) {
            try {
              await this.users.save(u);
            } catch (ee: any) {
              this.logger.error(`Failed to upsert user ${u.id}: ${ee.message}`);
              if (opts?.onError) await opts.onError(ee);
              failed += 1;
              failedDetails.push({ id: u.id, reason: `save: ${ee.message}` });
            }
          }
        }

        allFriendIds.push(...friendIds);

        if (items.length < pageSize) break;
        offset += items.length;
      }

      try {
        const uniqueIds = Array.from(new Set(allFriendIds));
        await this.friendships.replaceForUser(params.user_id, uniqueIds);
      } catch (e: any) {
        this.logger.error(
          `Failed to replace edges for ${params.user_id}: ${e.message}`,
        );
      }

      // Обновляем friends_added при успешном завершении
      try {
        await this.users.updateFriendsAdded(params.user_id, new Date());
      } catch (updateErr: any) {
        this.logger.warn(
          `Failed to update friends_added for user ${params.user_id}: ${
            updateErr?.message || updateErr
          }`,
        );
      }

      return { processed, failed, failedDetails };
    } catch (apiError: any) {
      // При ошибке API не перезаписываем данные пользователя
      // Обновляем только friends_added через updateFriendsAdded
      this.logger.error(
        `Failed to load friends for user ${params.user_id}: ${
          apiError?.message || apiError
        }`,
      );

      const errorCode =
        apiError instanceof VkApiError ? apiError.code : undefined;

      if (errorCode !== undefined) {
        try {
          await this.users.updateFriendsAdded(
            params.user_id,
            `err:${errorCode}`,
          );
        } catch (updateErr: any) {
          this.logger.warn(
            `Failed to update friends_added (error code) for user ${
              params.user_id
            }: ${updateErr?.message || updateErr}`,
          );
        }
      }

      // Пробрасываем ошибку дальше
      throw apiError;
    }
  }
}
