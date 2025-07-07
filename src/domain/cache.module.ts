import { Module } from '@nestjs/common';
import { GrpcModule } from 'src/grpc/grpc.module';
import { LocalCacheService } from './services/cache.service';

@Module({
    imports: [GrpcModule],
    providers: [LocalCacheService],
    controllers: [],
    exports: [LocalCacheService],
})
export class CacheModule {}
