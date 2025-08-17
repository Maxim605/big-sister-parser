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
}
