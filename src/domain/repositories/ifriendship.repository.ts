export interface IFriendshipRepository {
  deleteAllForUser(userId: number): Promise<void>;
  saveEdges(userId: number, friendIds: number[]): Promise<void>;
  replaceForUser(userId: number, friendIds: number[]): Promise<void>;
  countForUser(userId: number): Promise<number>;
  findFriendIds(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<number[]>;
  /**
   * Получить списки друзей для нескольких пользователей (bulk операция)
   */
  findFriendIdsMany(userIds: number[]): Promise<Map<number, number[]>>;
}
