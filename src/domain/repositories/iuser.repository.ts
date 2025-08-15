import { VkUser } from '../entities/vk-user';

export interface IUserRepository {
  findById(id: number): Promise<VkUser | null>;
  findManyByIds(ids: number[]): Promise<VkUser[]>;
  save(user: VkUser): Promise<void>;
  deleteById(id: number): Promise<void>;
}
