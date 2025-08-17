import { RateLimiter } from "./rate-limiter";

export type KeyStatus = "active" | "invalid" | "paused";

export interface KeyState {
  id: string;
  network: string;
  tokenEncrypted: string;
  status: KeyStatus;
  pausedUntil?: number | null;
  limiter: RateLimiter;
  errorCount: number;
  lastUsedAt?: number;
}

export interface PickContext {
  now: number;
}
