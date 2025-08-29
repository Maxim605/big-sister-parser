export interface IJobStatusRepository {
	setStatus(jobId: string, payload: any, ttlSeconds?: number): Promise<void>;
	getStatus(jobId: string): Promise<any | null>;
} 