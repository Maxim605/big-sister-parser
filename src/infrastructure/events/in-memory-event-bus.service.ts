import { Injectable } from "@nestjs/common";
import { IDomainEventBus } from "src/application/services/event-bus.port";

@Injectable()
export class InMemoryEventBus implements IDomainEventBus {
	private handlers: Array<(evt: any) => void> = [];

	async publish<T extends object = any>(event: T): Promise<void> {
		for (const h of this.handlers) {
			try { h(event); } catch {}
		}
	}

	on(handler: (evt: any) => void) {
		this.handlers.push(handler);
	}
} 