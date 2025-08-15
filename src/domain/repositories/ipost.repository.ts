import { VkPost } from '../entities/vk-post';

export interface IPostRepository {
  findById(id: string): Promise<VkPost | null>;
  findManyByIds(ids: string[]): Promise<VkPost[]>;
  save(post: VkPost): Promise<void>;
  deleteById(id: string): Promise<void>;
}
