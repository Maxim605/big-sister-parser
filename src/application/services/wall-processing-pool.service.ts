import { Injectable, Logger } from "@nestjs/common";

export interface RateLimiter {
  acquireToken(): Promise<void>;
}

class Semaphore {
  private queue: Array<() => void> = [];
  private counter: number;
  constructor(private readonly limit: number) {
    this.counter = limit;
  }
  async acquire(): Promise<void> {
    if (this.counter > 0) {
      this.counter--;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }
  release() {
    this.counter++;
    if (this.counter > this.limit) this.counter = this.limit;
    const r = this.queue.shift();
    if (r) {
      this.counter--;
      r();
    }
  }
}

@Injectable()
export class WallProcessingPool {
  private readonly logger = new Logger(WallProcessingPool.name);
  private semaphore: Semaphore;

  constructor(
    private readonly concurrency: number,
    private readonly rateLimiter?: RateLimiter,
  ) {
    this.semaphore = new Semaphore(Math.max(1, concurrency));
  }

  async scheduleSegments(
    segments: Array<{ start: number; end: number; pageSize: number }>,
    handler: (start: number, offset: number, pageSize: number) => Promise<void>,
  ): Promise<void> {
    const tasks: Promise<void>[] = [];

    for (const seg of segments) {
      const task = (async () => {
        await this.semaphore.acquire();
        try {
          for (
            let offset = seg.start;
            offset < seg.end;
            offset += seg.pageSize
          ) {
            if (this.rateLimiter) await this.rateLimiter.acquireToken();
            await handler(seg.start, offset, seg.pageSize);
          }
        } finally {
          this.semaphore.release();
        }
      })();
      tasks.push(task);
    }

    await Promise.allSettled(tasks);
  }
}
