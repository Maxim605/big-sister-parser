import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { Observable } from "rxjs";
import { FriendsStreamEvent } from "../../application/use-cases/vk-friends/dto/friends-stream.events";

@Injectable()
export class VkFriendsQueueEventsService implements OnModuleDestroy {
  private events: QueueEvents;

  constructor(private readonly queue: Queue) {
    this.events = new QueueEvents("vk-friends-load", {
      connection: (this.queue as any).opts.connection,
    });
  }

  onModuleDestroy() {
    this.events.close();
  }

  async addJob(
    userId: number,
    opts?: JobsOptions,
    extraParams?: Record<string, any>,
  ) {
    return this.queue.add(
      "load",
      { params: { user_id: userId, ...(extraParams || {}) } },
      { removeOnComplete: 100, removeOnFail: 100, ...opts },
    );
  }

  stream(jobId: string): Observable<FriendsStreamEvent> {
    return new Observable<FriendsStreamEvent>((subscriber) => {
      const handleProgress = ({ jobId: id, data }: any) => {
        if (id !== jobId) return;
        subscriber.next({
          type: "progress",
          jobId,
          processed: data?.processed ?? 0,
          failed: data?.failed ?? 0,
          message: data?.message,
        });
      };
      const handleCompleted = ({ jobId: id, returnvalue }: any) => {
        if (id !== jobId) return;
        subscriber.next({ type: "completed", jobId, result: returnvalue });
        subscriber.complete();
      };
      const handleFailed = ({ jobId: id, failedReason }: any) => {
        if (id !== jobId) return;
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
