export interface ISubscriptionRepository {
  upsertUserGroups(vkUserId: number, groupIds: number[]): Promise<void>;
  getGroupIdsByUser(
    vkUserId: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]>;
  resetUserGroups(vkUserId: number): Promise<void>;
  addUserGroups(vkUserId: number, groupIds: number[]): Promise<void>;

  /** Сохранить участников группы (group -> users) */
  upsertGroupMembers(groupId: number, userIds: number[]): Promise<void>;
  /** Получить ID участников группы */
  getMemberIdsByGroup(
    groupId: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]>;
  /** Удалить всех участников группы */
  resetGroupMembers(groupId: number): Promise<void>;
}
