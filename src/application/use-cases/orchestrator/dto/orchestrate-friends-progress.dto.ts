export interface OrchestrateFriendsProgressInfo {
  processed: number;
  total: number;
  currentUserId?: number;
  success?: boolean;
  error?: string;
}

export type OrchestrateFriendsProgressCallback = (
  info: OrchestrateFriendsProgressInfo,
) => void | Promise<void>;
