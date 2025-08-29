export interface IDomainEventBus {
	publish<T extends object = any>(event: T): Promise<void>;
} 