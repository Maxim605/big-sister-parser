export interface IMetricsService {
	incr(key: string, by?: number): Promise<void>;
} 