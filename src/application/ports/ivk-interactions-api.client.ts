import {
  VkLikesGetListParams,
  VkLikesGetListResponse,
  VkWallGetCommentsParams,
  VkWallGetCommentsResponse,
} from "src/infrastructure/vk/types";

export interface IVkInteractionsApiClient {
  likesGetList(params: VkLikesGetListParams): Promise<VkLikesGetListResponse>;
  wallGetComments(
    params: VkWallGetCommentsParams,
  ): Promise<VkWallGetCommentsResponse>;
}
