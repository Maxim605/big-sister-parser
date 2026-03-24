import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import settings from "src/settings";

/** Поля, доступные для запроса информации о группе */
export const GROUP_FIELDS_DEFAULT = [
  "members_count",
  "type",
  "activity",
  "city",
  "wall",
  "counters",
];

/** DTO для получения информации о группе из VK API (fetch / load) */
export class GroupInfoParamsDto {
  @ApiProperty({
    description: "ID группы или её короткое имя (screen_name)",
    example: settings.vkApi.defaultGroupId ?? 31480508,
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
    description:
      "Дополнительные поля (через запятую). " +
      "Не запрашивать: photo_50, photo_100, photo_200",
    example: GROUP_FIELDS_DEFAULT.join(","),
    default: GROUP_FIELDS_DEFAULT.join(","),
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({
    description: "Перезаписать данные, если группа уже сохранена",
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  rewrite?: boolean;

  @ApiPropertyOptional({
    description: "Режим выполнения: sync, async или stream",
    enum: ["sync", "async", "stream"],
    default: "sync",
    example: "sync",
  })
  @IsOptional()
  @IsIn(["sync", "async", "stream"])
  mode?: "sync" | "async" | "stream";
}

/** DTO для получения информации о группе из БД */
export class GroupInfoGetParamsDto {
  @ApiProperty({
    description: "ID группы",
    example: settings.vkApi.defaultGroupId ?? 31480508,
  })
  @IsString()
  group_id: string;
}
