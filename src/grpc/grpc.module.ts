import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GrpcService } from './services/grpc.service';
import { GrpcController } from './grpc.controller';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'ARANGO_GRPC_CLIENT',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'arango',
            protoPath: join(__dirname, '../proto/arango.proto'),
            url: configService.get<string>('GRPC_ARANGO_URL', 'localhost:50051'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [GrpcService],
  controllers: [GrpcController],
  exports: [GrpcService],
})
export class GrpcModule {}
