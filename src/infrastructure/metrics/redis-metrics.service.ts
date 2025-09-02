import { Inject, Injectable } from "@nestjs/common";
import { IMetricsService } from "src/application/ports/imetrics.service";
import { TOKENS } from "src/common/tokens";

@Injectable()
export class RedisMetricsService implements IMetricsService {
	constructor(@Inject(TOKENS.RedisClient) private readonly redis: any) {}

	async incr(key: string, by: number = 1): Promise<void> {
		try {
			if (typeof by === "number" && by !== 1) {
				await this.redis.incrby?.(key, by);
				return;
			}
			await this.redis.incr?.(key);
		} catch {}
	}
} 