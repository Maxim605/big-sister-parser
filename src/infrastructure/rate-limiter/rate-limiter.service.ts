import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { TOKENS } from "src/common/tokens";

export interface AcquireResult {
  allowed: boolean;
  waitMs: number;
}

export interface RateLimiterOptions {
  capacity: number;
  refillRate: number;
}

export interface IRateLimiter {
  acquire(key: string, tokens?: number): Promise<AcquireResult>;
  acquireOrSleep(key: string, tokens?: number): Promise<void>;
}

const LUA_TOKEN_BUCKET = `
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local take = tonumber(ARGV[4])

local key_tokens = KEYS[1] .. ':tokens'
local key_ts = KEYS[1] .. ':ts'

local tokens = tonumber(redis.call('GET', key_tokens) or capacity)
local last_ts = tonumber(redis.call('GET', key_ts) or 0)
local delta = math.max(0, now - last_ts)
local add = math.floor(delta/1000 * refill_rate)
if add > 0 then
  tokens = math.min(capacity, tokens + add)
  redis.call('SET', key_tokens, tokens)
  redis.call('SET', key_ts, now)
end

if tokens >= take then
  redis.call('DECRBY', key_tokens, take)
  return {1, 0}
else
  local need = take - tokens
  local wait = math.ceil(need / refill_rate) * 1000
  return {0, wait}
end
`;

class InMemoryBucket {
  private tokens: number;
  private lastTs: number;
  constructor(private readonly opts: RateLimiterOptions) {
    this.tokens = opts.capacity;
    this.lastTs = Date.now();
  }
  take(now: number, take: number): AcquireResult {
    const delta = Math.max(0, now - this.lastTs);
    const add = Math.floor((delta / 1000) * this.opts.refillRate);
    if (add > 0) {
      this.tokens = Math.min(this.opts.capacity, this.tokens + add);
      this.lastTs = now;
    }
    if (this.tokens >= take) {
      this.tokens -= take;
      return { allowed: true, waitMs: 0 };
    }
    const need = take - this.tokens;
    const waitMs = Math.ceil(need / this.opts.refillRate) * 1000;
    return { allowed: false, waitMs };
  }
}

@Injectable()
export class RateLimiterService implements IRateLimiter {
  private readonly logger = new Logger(RateLimiterService.name);
  private scriptSha?: string;
  private memoryBuckets = new Map<string, InMemoryBucket>();

  constructor(
    @Inject(TOKENS.RedisClient) private readonly redis: Redis,
    private readonly options: RateLimiterOptions = {
      capacity: 20,
      refillRate: 5,
    },
  ) {}

  private async ensureScript(): Promise<void> {
    if (this.scriptSha) return;
    try {
      const sha = (await (this.redis as any).script(
        "LOAD",
        LUA_TOKEN_BUCKET,
      )) as string;
      this.scriptSha = typeof sha === "string" ? sha : String(sha);
    } catch (e) {
      this.scriptSha = undefined;
    }
  }

  private getMemBucket(key: string): InMemoryBucket {
    let b = this.memoryBuckets.get(key);
    if (!b) {
      b = new InMemoryBucket(this.options);
      this.memoryBuckets.set(key, b);
    }
    return b;
  }

  async acquire(key: string, tokens = 1): Promise<AcquireResult> {
    await this.ensureScript();
    const now = Date.now();
    if (this.scriptSha) {
      try {
        const res: [number, number] = (await (this.redis as any).evalsha(
          this.scriptSha,
          1,
          key,
          String(this.options.capacity),
          String(this.options.refillRate),
          String(now),
          String(tokens),
        )) as any;
        return { allowed: res[0] === 1, waitMs: res[1] };
      } catch (e) {
        this.logger.warn(`Redis evalsha error, fallback on in-memory: ${e}`);
      }
    }
    return this.getMemBucket(key).take(now, tokens);
  }

  async acquireOrSleep(key: string, tokens = 1): Promise<void> {
    while (true) {
      const { allowed, waitMs } = await this.acquire(key, tokens);
      if (allowed) return;
      const jitter = Math.floor(Math.random() * 100);
      const delay = Math.max(50, waitMs + jitter);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
