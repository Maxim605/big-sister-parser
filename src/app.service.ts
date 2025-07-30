import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): any {
    return {
      app: "Parser backend API, 2025",
      version: "1.0",
    };
  }
}
