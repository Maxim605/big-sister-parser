/**
 * Параметры запроса метода friends.get VK API
 */
export interface VkFriendsGetParams {
  user_id: number;
  order?: "name" | "hints";
  list_id?: number;
  count?: number;
  offset?: number;
  fields?: string[];
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";
  token: string;
}

/**
 * Ответ VK API для метода friends.get
 */
export interface VkFriendsGetResponse {
  count: number;
  items: Array<number | VkFriend>;
}

/**
 * Описание одного друга с полями
 */
export interface VkFriend {
  id: number;
  first_name: string;
  last_name: string;
  deactivated?: string;
  hidden?: number;
  bdate?: string;
  sex?: number;
  city?: { id: number; title: string };
  country?: { id: number; title: string };
  online?: number;
  last_seen?: { time: number; platform: number };
  photo_50?: string;
  photo_100?: string;
  photo_200_orig?: string;
  is_closed?: boolean;
  can_access_closed?: boolean;
}
