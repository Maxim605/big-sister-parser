export interface IFriendshipRepository {
  deleteAllForUser(userId: number): Promise<void>;
  saveEdges(userId: number, friendIds: number[]): Promise<void>;
}
