import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";
import settings from "src/settings";

/** DTO для получения / загрузки постов со стены группы */
export class GroupPostsParamsDto {
  @ApiProperty({
    description: "ID группы (положительный; owner_id будет отрицательным)",
    example: settings.vkApi.defaultGroupId ?? 31480508,
  })
  @Type(() => Number)
  @IsInt()
  group_id: number;

  @ApiProperty({
    description: "Токен доступа VK API",
    example: settings.token.vkDefault,
  })
  @IsString()
  access_token: string;

  @ApiPropertyOptional({
    description: "Смещение для пагинации",
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description:
      "Общее количество постов для загрузки (0 = все доступные посты)",
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  count?: number;

  @ApiPropertyOptional({
    description: "Размер страницы (макс. 100)",
    example: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page_size?: number;

  @ApiPropertyOptional({
    description: "Перезаписать данные, если посты уже сохранены",
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  rewrite?: boolean;

  @ApiPropertyOptional({
    description: "Режим выполнения: sync (последовательный), async (параллельный), stream (потоковый SSE)",
    enum: ["sync", "async", "stream"],
    default: "sync",
    example: "sync",
  })
  @IsOptional()
  @IsIn(["sync", "async", "stream"])
  mode?: "sync" | "async" | "stream";
}

/** DTO для получения постов из БД */
export class GroupPostsGetParamsDto {
  @ApiProperty({
    description: "ID группы",
    example: settings.vkApi.defaultGroupId ?? 31480508,
  })
  @Type(() => Number)
  @IsInt()
  group_id: number;

  @ApiPropertyOptional({
    description: "Смещение",
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: "Количество записей",
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  count?: number;
}
