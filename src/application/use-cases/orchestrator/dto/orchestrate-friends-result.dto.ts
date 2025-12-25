import { UserFriendsResult } from "./user-friends-result.dto";

export interface OrchestrateFriendsResult {
  processed: number;
  failed: number;
  results: UserFriendsResult[];
}
