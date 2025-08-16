import { Inject, Injectable, Logger } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import { IKeyManager } from "../services/key-manager.port";
import { ISocialApiClient } from "../ports/social-api.client";
import { IUserRepository } from "../../domain/repositories/iuser.repository";
import { IFriendshipRepository } from "../../domain/repositories/ifriendship.repository";

interface SyncResult {
  userId: number;
  total: number;
  fetched: number;
}

@Injectable()
export class SyncFriendsUseCase {
  private readonly logger = new Logger(SyncFriendsUseCase.name);

  constructor(
    @Inject(TOKENS.IKeyManager) private readonly keyManager: IKeyManager,
    @Inject(TOKENS.ISocialApiClient) private readonly api: ISocialApiClient,
    @Inject(TOKENS.IUserRepository) private readonly users: IUserRepository,
    @Inject(TOKENS.IFriendshipRepository)
    private readonly friendships: IFriendshipRepository,
  ) {}

  async execute(userId: number): Promise<SyncResult> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new Error(`User ${userId} not found. Import the user first.`);

    await this.friendships.deleteAllForUser(userId);

    const limit = 5000;
    let offset = 0;
    let total = 0;
    let fetched = 0;

    while (true) {
      const lease = await this.keyManager.leaseKey(this.api.network);
      try {
        const { data, statusCode, headers } = await this.api.call<any>(
          "friends.get",
          { user_id: userId, count: limit, offset },
          lease,
        );
        await this.keyManager.releaseKey(lease, { statusCode, headers });

        const count: number =
          typeof data?.count === "number"
            ? data.count
            : Array.isArray(data)
            ? data.length
            : 0;
        const items: number[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        if (offset === 0) total = count;

        if (!items.length) break;
        fetched += items.length;

        await this.friendships.saveEdges(userId, items);

        offset += items.length;
        if (total && offset >= total) break;
      } catch (err: any) {
        const statusCode = err?.statusCode ?? 500;
        const headers = err?.headers;
        try {
          await this.keyManager.releaseKey(lease, {
            statusCode,
            headers,
            error: err,
          });
        } catch {}
        this.logger.warn(
          `SyncFriends failed for ${userId} at offset=${offset}: ${
            err?.message || err
          }`,
        );
        throw err;
      }
    }

    return { userId, total, fetched };
  }
}
