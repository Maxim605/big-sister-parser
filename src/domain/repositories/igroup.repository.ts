import { VkGroup } from "../entities/vk-group";

export interface IGroupRepository {
  findById(id: number): Promise<VkGroup | null>;
  findManyByIds(ids: number[]): Promise<VkGroup[]>;
  save(group: VkGroup): Promise<void>;
  deleteById(id: number): Promise<void>;
}
