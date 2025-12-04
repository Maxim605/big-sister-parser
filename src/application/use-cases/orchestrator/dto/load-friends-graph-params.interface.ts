export interface LoadFriendsGraphParams {
  start_id: number;
  max_depth?: number | null;
  rewrite?: boolean;
  mode: "sync" | "async" | "stream";
  db_batch_size?: number;
  api_batch_size?: number;
  api_concurrency?: number;
  worker_count?: number;
  api_timeout_ms?: number;
  max_retries?: number;
  backoff_base_ms?: number;
  redis_namespace?: string;
  job_ttl?: number;
  access_token: string;
  fields?: string[];
  name_case?: string;
}

