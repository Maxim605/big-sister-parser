import { VkUser } from "../entities/vk-user";

export interface IUserRepository {
  findById(id: number): Promise<VkUser | null>;
  findManyByIds(ids: number[]): Promise<VkUser[]>;
  save(user: VkUser): Promise<void>;
  saveMany(users: VkUser[]): Promise<void>;
  deleteById(id: number): Promise<void>;
  updateFriendsAdded(
    userId: number,
    value: Date | number | string,
  ): Promise<void>;
  /**
   * Получить статусы друзей для списка пользователей (только id и friends_added)
   */
  findFriendsStatusByIds(ids: number[]): Promise<
    Map<
      number,
      {
        status: "ok" | "error" | "unknown";
        errorCode?: string;
        lastUpdated?: Date;
      }
    >
  >;
  /**
   * Bulk обновление friends_added для списка пользователей
   */
  updateFriendsAddedMany(
    updates: Array<{ userId: number; value: Date | number | string }>,
  ): Promise<void>;
}
