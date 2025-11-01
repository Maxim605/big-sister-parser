import { VkFriendsGetParams } from "src/infrastructure/vk/types";
import { OrchestrateFriendsProgressCallback } from "./orchestrate-friends-progress.dto";

export interface OrchestrateFriendsParams {
  userIds: number[];
  batchSize?: number;
  concurrency?: number;
  mode: "fetch" | "load" | "get";
  params?: Partial<VkFriendsGetParams>;
  onProgress?: OrchestrateFriendsProgressCallback;
}
