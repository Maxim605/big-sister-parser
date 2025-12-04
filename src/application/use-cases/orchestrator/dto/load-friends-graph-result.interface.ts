import { LoadFriendsGraphStats } from "./load-friends-graph-stats.interface";

export interface LoadFriendsGraphResult {
  job_id: string;
  visited_count: number;
  levels_processed: number;
  stats: LoadFriendsGraphStats;
  visited_ids: number[];
}

