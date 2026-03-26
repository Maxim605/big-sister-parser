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

/** DTO для получения / загрузки участников (подписчиков) группы */
export class GroupMembersParamsDto {
  @ApiProperty({
    description: "ID группы или её короткое имя (screen_name)",
    example: String(settings.vkApi.defaultGroupId ?? 31480508),
  })
  @IsString()
  group_id: string;

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
    description: "Общее количество участников для загрузки (0 = все)",
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  count?: number;

  @ApiPropertyOptional({
    description: "Размер страницы (макс. 1000)",
    example: 1000,
    default: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page_size?: number;

  @ApiPropertyOptional({
    description:
      "Дополнительные поля профиля участников (через запятую). " +
      "Например: sex,bdate,city,country",
    example: "",
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: "Перезаписать данные, если участники уже сохранены",
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  rewrite?: boolean;

  @ApiPropertyOptional({
    description:
      "Режим выполнения: sync (последовательный), async (параллельный), stream (потоковый SSE)",
    enum: ["sync", "async", "stream"],
    default: "sync",
    example: "sync",
  })
  @IsOptional()
  @IsIn(["sync", "async", "stream"])
  mode?: "sync" | "async" | "stream";
}

/** DTO для получения участников из БД */
export class GroupMembersGetParamsDto {
  @ApiProperty({
    description: "ID группы",
    example: String(settings.vkApi.defaultGroupId ?? 31480508),
  })
  @IsString()
  group_id: string;
}
