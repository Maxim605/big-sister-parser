/**
 * Параметры запроса метода friends.get VK API
 */
export interface FriendsGetParams {
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
export interface FriendsGetResponse {
  count: number;
  items: Array<number | Friend>;
}

/**
 * Описание одного друга с полями
 */
export interface Friend {
  id: number;
  first_name: string;
  last_name: string;
  deactivated?: string;
  hidden?: number;
  [key: string]: any;
}
