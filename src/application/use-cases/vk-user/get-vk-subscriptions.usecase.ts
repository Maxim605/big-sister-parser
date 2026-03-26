import { Injectable, Inject } from "@nestjs/common";
import { TOKENS } from "src/common/tokens";
import { IGroupRepository } from "src/domain/repositories/igroup.repository";

@Injectable()
export class GetVkSubscriptionsUseCase {
  constructor(
    @Inject(TOKENS.IGroupRepository)
    private readonly groups: IGroupRepository,
  ) {}

  async execute(
    user_id: number,
    count?: number,
    offset?: number,
  ): Promise<{ count: number; items: number[] }> {
    const total = await this.groups.countSubscriptionsForUser(user_id);
    const items = await this.groups.findSubscriptionGroupIds(
      user_id,
      count,
      offset,
    );
    return { count: total || 0, items };
  }
}
