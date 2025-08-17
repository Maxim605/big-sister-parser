import { Injectable, Inject } from "@nestjs/common";
import { VkFriendsResponse } from "src/infrastructure/vk/types";
import { TOKENS } from "src/common/tokens";
import { IFriendshipRepository } from "src/domain/repositories/ifriendship.repository";

@Injectable()
export class GetVkFriendsUseCase {
  constructor(
    @Inject(TOKENS.IFriendshipRepository)
    private readonly friendships: IFriendshipRepository,
  ) {}

  async execute(
    user_id: number,
    count?: number,
    offset?: number,
  ): Promise<VkFriendsResponse> {
    const total = await this.friendships.countForUser(user_id);
    const items = await this.friendships.findFriendIds(user_id, count, offset);
    return { count: total || 0, items };
  }
}
