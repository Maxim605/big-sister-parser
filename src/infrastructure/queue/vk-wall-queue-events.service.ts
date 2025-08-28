import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { Observable } from "rxjs";

export type WallGetStreamEvent =
  | {
      type: "started";
      jobId: string | number;
      owner_id?: number;
      domain?: string;
      offset?: number;
      count?: number;
    }
  | { type: "progress"; jobId: string | number; progress: any }
  | { type: "completed"; jobId: string | number; result: any }
  | { type: "failed"; jobId: string | number; error: string };

@Injectable()
export class VkWallQueueEventsService implements OnModuleDestroy {
  private events: QueueEvents;

  constructor(private readonly queue: Queue) {
    this.events = new QueueEvents("vk-wall-load", {
      connection: (this.queue as any).opts.connection,
    });
  }

  onModuleDestroy() {
    this.events.close();
  }

  async addGetJob(
    payload: {
      owner_id?: number;
      domain?: string;
      offset?: number;
      count?: number;
      token?: string;
      extended?: number;
    },
    opts?: JobsOptions,
  ) {
    return this.queue.add(
      "get",
      { type: "get", payload },
      { removeOnComplete: 100, removeOnFail: 100, ...(opts || {}) },
    );
  }

  async addLoadOwnerJob(
    payload: {
      ownerId: number;
      domain?: string;
      offset?: number;
      count?: number;
      mode?: string;
      token?: string;
    },
    opts?: JobsOptions,
  ) {
    return this.queue.add(
      "load-owner",
      { type: "owner", payload },
      { removeOnComplete: 100, removeOnFail: 100, ...(opts || {}) },
    );
  }

  stream(jobId: string): Observable<WallGetStreamEvent> {
    return new Observable<WallGetStreamEvent>((subscriber) => {
      const handleProgress = ({ jobId: id, data }: any) => {
        if (String(id) !== String(jobId)) return;
        subscriber.next({
          type: "progress",
          jobId,
          progress: data,
        });
      };
      const handleCompleted = ({ jobId: id, returnvalue }: any) => {
        if (String(id) !== String(jobId)) return;
        subscriber.next({ type: "completed", jobId, result: returnvalue });
        subscriber.complete();
      };
      const handleFailed = ({ jobId: id, failedReason }: any) => {
        if (String(id) !== String(jobId)) return;
        subscriber.next({
          type: "failed",
          jobId,
          error: failedReason || "Unknown error",
        });
        subscriber.complete();
      };

      this.events.on("progress", handleProgress);
      this.events.on("completed", handleCompleted);
      this.events.on("failed", handleFailed);

      return () => {
        this.events.off("progress", handleProgress);
        this.events.off("completed", handleCompleted);
        this.events.off("failed", handleFailed);
      };
    });
  }
}
