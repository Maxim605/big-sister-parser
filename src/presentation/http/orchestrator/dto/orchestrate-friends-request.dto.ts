import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import settings from "src/settings";

export class OrchestrateFriendsRequestDto {
  @ApiProperty({
    description: "Список ID пользователей VK для обработки",
    type: [Number],
    example: [508133099, 123456789],
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
}

