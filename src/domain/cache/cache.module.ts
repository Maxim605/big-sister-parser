import { Module } from "@nestjs/common";
import { LocalCacheService } from "./services/cache.service";

@Module({
  imports: [],
  providers: [LocalCacheService],
  controllers: [],
  exports: [LocalCacheService],
})
export class CacheModule {}
