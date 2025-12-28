export interface FriendBatchEvent {
  job_id: string;
  level: number;
  source_id: number;
  batch_index: number;
  friends: number[];
  status: "ok" | "partial" | "error";
  error_code?: string;
}
