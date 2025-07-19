import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { API_V1, AUTH_KEY, V1 } from "./constants";
import settings from "./settings";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Settings } from "luxon";

function setupSwagger(app: INestApplication) {
  const options = new DocumentBuilder()
    .setTitle("Big Sister Parser")
    .setDescription("Документация по API")
    .setVersion(V1)
    .addApiKey(
      {
        type: "apiKey",
        name: "Authorization",
        in: "header",
      },
      AUTH_KEY,
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);

  /**
   * Swagger-документация доступна только в режиме отладки по маршруту /api/v1.
   */
  if (settings.debug) {
    SwaggerModule.setup(`${settings.basePath}/${API_V1}`, app, document);
  }
}

function setupDateTime(): void {
  Settings.defaultLocale = "ru";
  Settings.defaultZone = "Europe/Moscow";
}

async function bootstrap() {
  // TODO
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use((req: any, res: any, next: () => void) => {
    const sessionId = req.sessionID;
    next();
  });

  app.setGlobalPrefix(settings.basePath);

  // Настройка глобальной валидации
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupSwagger(app);
  // Luxon настройка дефолтного часового пояса
  setupDateTime();

  const port = process.env.NODE_PORT || 3000;
  await app.listen(port).then(() => {
    console.log(`App started. Port: ${port}`);
  });
}
bootstrap();
