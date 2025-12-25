import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsBoolean,
  IsNotEmpty,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import settings from "src/settings";

export class LoadFriendsGraphRequestDto {
  @ApiProperty({
    description: "Идентификатор стартового пользователя",
    example: 508133099,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  start_id: number;

  @ApiPropertyOptional({
    description:
      "Целевое количество уровней (null или 1 = только соседи стартового узла)",
    example: 2,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  max_depth?: number | null;

  @ApiPropertyOptional({
    description: "Если true, игнорировать локальную БД и получать данные из API",
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === "true" || value === true || value === 1 || value === "1")
      return true;
    if (value === "false" || value === false || value === 0 || value === "0")
      return false;
    return undefined;
  })
  rewrite?: boolean;

  @ApiProperty({
    description: "Режим работы: sync (синхронный), async (асинхронный), stream (поточный)",
    enum: ["sync", "async", "stream"],
    example: "sync",
  })
  @IsNotEmpty()
  @IsIn(["sync", "async", "stream"])
  mode: "sync" | "async" | "stream";

  @ApiPropertyOptional({
    description: "Размер батча для чтения из БД (по умолчанию 500)",
    example: 500,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  db_batch_size?: number;

  @ApiPropertyOptional({
    description: "Размер батча для API запросов (по умолчанию 100)",
    example: 100,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  api_batch_size?: number;

  @ApiPropertyOptional({
    description: "Параллелизм API запросов (по умолчанию 16)",
    example: 16,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  api_concurrency?: number;

  @ApiPropertyOptional({
    description: "Количество воркеров для async/stream режимов (по умолчанию 8)",
    example: 8,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  worker_count?: number;

  @ApiPropertyOptional({
    description: "Таймаут API запросов в миллисекундах (по умолчанию 30000)",
    example: 30000,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  api_timeout_ms?: number;

  @ApiPropertyOptional({
    description: "Максимальное количество повторных попыток (по умолчанию 3)",
    example: 3,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  max_retries?: number;

  @ApiPropertyOptional({
    description:
      "Базовое время задержки для экспоненциального backoff (по умолчанию 500)",
    example: 500,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  backoff_base_ms?: number;

  @ApiPropertyOptional({
    description: "Префикс для ключей Redis (по умолчанию 'graph')",
    example: "graph",
    type: String,
  })
  @IsOptional()
  @IsString()
  redis_namespace?: string;

  @ApiPropertyOptional({
    description: "TTL для данных джоба в Redis в секундах (по умолчанию 3600)",
    example: 3600,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  job_ttl?: number;

  @ApiProperty({
    description: "VK API access_token",
    example: settings.token.vkDefault,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiPropertyOptional({
    description: "Дополнительные поля для запроса друзей (через запятую)",
    example: "city,bdate,sex",
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((f) => f.trim()).filter((f) => f.length > 0);
    }
    if (Array.isArray(value)) {
      return value;
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({
    description: "Падеж для склонения имени",
    enum: ["nom", "gen", "dat", "acc", "ins", "abl"],
    example: "nom",
  })
  @IsOptional()
  @IsIn(["nom", "gen", "dat", "acc", "ins", "abl"])
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";
}

