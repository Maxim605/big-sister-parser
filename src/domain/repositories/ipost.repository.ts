import { VkPost } from "../entities/vk-post";

export interface IPostRepository {
  findById(id: string): Promise<VkPost | null>;
  findManyByIds(ids: string[]): Promise<VkPost[]>;
  save(post: VkPost): Promise<void>;
  deleteById(id: string): Promise<void>;

  findByKeys(keys: string[]): Promise<VkPost[]>;

  upsertMany(
    posts: VkPost[],
    options?: { chunkSize?: number; parallelBatchesConcurrency?: number },
  ): Promise<{ success: number; failed: Array<{ index: number; error: any }> }>;

  deleteByOwner(ownerId: number): Promise<void>;

  bulkGetExistingKeys(keys: string[]): Promise<string[]>;

  findByOwner(
    ownerId: number,
    opts?: { offset?: number; count?: number },
  ): Promise<VkPost[]>;
}
