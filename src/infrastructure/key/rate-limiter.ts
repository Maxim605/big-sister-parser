export interface RateLimiterOptions {
  tokensPerInterval: number;
  intervalMs: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly opts: RateLimiterOptions, now = Date.now()) {
    this.tokens = opts.tokensPerInterval;
    this.lastRefill = now;
  }

  private refill(now: number) {
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    const tokensToAdd = (elapsed / this.opts.intervalMs) * this.opts.tokensPerInterval;
    this.tokens = Math.min(this.opts.tokensPerInterval, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  canTake(now = Date.now()): boolean {
    this.refill(now);
    return this.tokens >= 1;
  }

  take(now = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  msUntilAvailable(now = Date.now()): number {
    this.refill(now);
    if (this.tokens >= 1) return 0;
    const missing = 1 - this.tokens;
    const ms = (missing / this.opts.tokensPerInterval) * this.opts.intervalMs;
    return Math.max(1, Math.ceil(ms));
  }
}
