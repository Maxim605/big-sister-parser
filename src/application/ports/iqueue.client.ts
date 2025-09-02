export interface QueueJobOptions {
	attempts?: number;
	backoff?: { type: string; delay: number } | number;
	removeOnComplete?: boolean | number;
	removeOnFail?: boolean | number;
}

export interface IQueueClient<T = any> {
	addJob(name: string, payload: T, opts?: QueueJobOptions): Promise<{ id: string | number }>;
	getJobState(id: string | number): Promise<any>;
} 