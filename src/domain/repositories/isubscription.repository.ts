export interface ISubscriptionRepository {
  upsertUserGroups(vkUserId: number, groupIds: number[]): Promise<void>;
  getGroupIdsByUser(
    vkUserId: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]>;
  resetUserGroups(vkUserId: number): Promise<void>;
  addUserGroups(vkUserId: number, groupIds: number[]): Promise<void>;
}
