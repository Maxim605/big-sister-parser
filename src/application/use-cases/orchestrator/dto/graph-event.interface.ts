import { FriendBatchEvent } from "./friend-batch-event.interface";
import { LevelCompleteEvent } from "./level-complete-event.interface";
import { JobCompleteEvent } from "./job-complete-event.interface";

export type GraphEvent = FriendBatchEvent | LevelCompleteEvent | JobCompleteEvent;

