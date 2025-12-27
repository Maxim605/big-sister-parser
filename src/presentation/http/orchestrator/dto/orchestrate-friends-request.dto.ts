import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
  IsNotEmpty,
  IsBoolean,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import settings from "src/settings";

export class OrchestrateFriendsRequestDto {
  @ApiProperty({
    description: "Список ID пользователей VK для обработки",
    type: [Number],
    example: [settings.vkApi.defaultStartId, 123456789],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  user_ids: number[];

  @ApiPropertyOptional({
    description: "Размер батча для обработки",
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  batch_size?: number;

  @ApiPropertyOptional({
    description: "Количество параллельных запросов",
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  concurrency?: number;

  @ApiPropertyOptional({
    description: "Дополнительные параметры для запроса друзей",
  })
  @IsOptional()
  count?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsIn(["nom", "gen", "dat", "acc", "ins", "abl"])
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";

  @ApiProperty({
    description: "VK API access_token (обязателен для режимов fetch и load)",
    example: settings.token.vkDefault,
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiPropertyOptional({
    description:
      "Перезаписать данные даже если они уже сохранены (по умолчанию false)",
    type: Boolean,
    default: false,
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
}
