import { ClientOptions, Transport } from "@nestjs/microservices";
import settings from "./settings";

const { grpc } = settings;

export const grpcConfig: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: grpc.package,
    protoPath: grpc.protoPath,
    url: grpc.url,
  },
};