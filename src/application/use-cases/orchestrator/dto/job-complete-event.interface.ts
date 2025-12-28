import { LoadFriendsGraphStats } from "./load-friends-graph-stats.interface";

export interface JobCompleteEvent {
  job_id: string;
  visited_count: number;
  levels_processed: number;
  stats: LoadFriendsGraphStats;
}
