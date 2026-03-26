export interface LevelCompleteEvent {
  job_id: string;
  level: number;
  frontier_size: number;
  visited_count: number;
}
