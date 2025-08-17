export type FriendsStreamEvent =
  | { type: "started"; jobId: string; userId: number }
  | {
      type: "progress";
      jobId: string;
      processed: number;
      failed: number;
      total?: number;
      message?: string;
    }
  | {
      type: "batchSaved";
      jobId: string;
      savedUsers: number;
      savedEdges: number;
    }
  | {
      type: "log";
      jobId: string;
      level: "info" | "warn" | "error";
      message: string;
    }
  | {
      type: "completed";
      jobId: string;
      result?: { processed: number; failed: number };
    }
  | { type: "failed"; jobId: string; error: string };
