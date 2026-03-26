export class Semaphore {
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
